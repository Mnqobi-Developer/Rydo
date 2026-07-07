using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Rydo.Api.Contracts;
using Rydo.Api.Data;
using Rydo.Api.Domain;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/trips")]
public sealed class TripsController(
    RydoDbContext db,
    GeometryFactory geometryFactory,
    PricingService pricing,
    DriverMatchingService matching,
    RideNotificationService notifications) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("trips")]
    public async Task<ActionResult<TripResponse>> Create(CreateTripRequest request, CancellationToken cancellationToken)
    {
        var pickup = geometryFactory.CreatePoint(new Coordinate(request.PickupLongitude, request.PickupLatitude));
        var destination = geometryFactory.CreatePoint(new Coordinate(request.DestinationLongitude, request.DestinationLatitude));

        var trip = new Trip
        {
            PassengerId = request.PassengerId,
            RideType = request.RideType,
            Status = TripStatus.Matching,
            PickupAddress = request.PickupAddress,
            PickupPoint = pickup,
            DestinationAddress = request.DestinationAddress,
            DestinationPoint = destination,
            EstimatedDistanceMeters = request.EstimatedDistanceMeters,
            EstimatedDurationSeconds = request.EstimatedDurationSeconds,
            PreferredPaymentMethod = request.PreferredPaymentMethod,
            EstimatedFare = pricing.EstimateFare(request.RideType, request.EstimatedDistanceMeters, request.EstimatedDurationSeconds)
        };

        db.Trips.Add(trip);
        await db.SaveChangesAsync(cancellationToken);

        var driverIds = await matching.FindNearbyDriversAsync(pickup, cancellationToken);
        foreach (var driverId in driverIds)
        {
            await notifications.NotifyDriverRequestAsync(driverId, trip);
        }

        await notifications.NotifyTripUpdatedAsync(trip);
        return CreatedAtAction(nameof(Get), new { tripId = trip.Id }, ToResponse(trip));
    }

    [HttpGet("{tripId:guid}")]
    public async Task<ActionResult<TripResponse>> Get(Guid tripId, CancellationToken cancellationToken)
    {
        var trip = await db.Trips
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.User)
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.Vehicles)
            .FirstOrDefaultAsync(x => x.Id == tripId, cancellationToken);
        return trip is null ? NotFound() : Ok(ToResponse(trip));
    }

    [HttpGet("passenger/{passengerId:guid}")]
    public async Task<ActionResult<IReadOnlyList<TripListItemResponse>>> GetPassengerTrips(Guid passengerId, CancellationToken cancellationToken)
    {
        var trips = await db.Trips
            .Where(x => x.PassengerId == passengerId)
            .OrderByDescending(x => x.RequestedAtUtc)
            .Take(20)
            .Select(x => ToListItem(x))
            .ToListAsync(cancellationToken);

        return Ok(trips);
    }

    [HttpPost("{tripId:guid}/accept")]
    [EnableRateLimiting("trips")]
    public async Task<ActionResult<TripResponse>> Accept(Guid tripId, AcceptTripRequest request, CancellationToken cancellationToken)
    {
        var trip = await db.Trips.FindAsync([tripId], cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        if (trip.Status is not TripStatus.Matching and not TripStatus.Requested)
        {
            return Conflict(new { error = "Trip is no longer available." });
        }

        var driverDeclined = await db.TripDeclines.AnyAsync(
            x => x.TripId == trip.Id && x.DriverProfileId == request.DriverProfileId,
            cancellationToken);
        if (driverDeclined)
        {
            return Conflict(new { error = "This driver already declined the trip." });
        }

        trip.DriverProfileId = request.DriverProfileId;
        trip.Status = TripStatus.DriverAssigned;
        trip.AcceptedAtUtc = DateTimeOffset.UtcNow;
        if (trip.PreferredPaymentMethod == PaymentMethod.Card)
        {
            await UpsertTripPaymentAsync(trip, PaymentStatus.Paid, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        var acceptedTrip = await LoadTripAsync(trip.Id, cancellationToken);
        await notifications.NotifyTripUpdatedAsync(acceptedTrip);
        return Ok(ToResponse(acceptedTrip));
    }

    [HttpPost("{tripId:guid}/decline")]
    [EnableRateLimiting("trips")]
    public async Task<ActionResult> Decline(Guid tripId, DeclineTripRequest request, CancellationToken cancellationToken)
    {
        var trip = await db.Trips.FirstOrDefaultAsync(x => x.Id == tripId, cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        if (trip.Status != TripStatus.Matching)
        {
            return Conflict(new { error = "Trip is no longer available." });
        }

        var driverExists = await db.Drivers.AnyAsync(x => x.Id == request.DriverProfileId, cancellationToken);
        if (!driverExists)
        {
            return NotFound(new { error = "Driver profile was not found." });
        }

        var alreadyDeclined = await db.TripDeclines.AnyAsync(
            x => x.TripId == trip.Id && x.DriverProfileId == request.DriverProfileId,
            cancellationToken);
        if (!alreadyDeclined)
        {
            db.TripDeclines.Add(new TripDecline
            {
                TripId = trip.Id,
                DriverProfileId = request.DriverProfileId
            });
            await db.SaveChangesAsync(cancellationToken);
        }

        var excludedDriverIds = await db.TripDeclines
            .Where(x => x.TripId == trip.Id)
            .Select(x => x.DriverProfileId)
            .ToListAsync(cancellationToken);
        var nextDriverIds = await matching.FindNearbyDriversAsync(trip.PickupPoint, cancellationToken, excludedDriverIds);
        foreach (var driverId in nextDriverIds)
        {
            await notifications.NotifyDriverRequestAsync(driverId, trip);
        }

        return NoContent();
    }

    [HttpPost("{tripId:guid}/arrive")]
    [EnableRateLimiting("trips")]
    public Task<ActionResult<TripResponse>> Arrive(Guid tripId, CancellationToken cancellationToken)
    {
        return SetStatus(tripId, TripStatus.DriverArriving, cancellationToken);
    }

    [HttpPost("{tripId:guid}/start")]
    [EnableRateLimiting("trips")]
    public Task<ActionResult<TripResponse>> Start(Guid tripId, CancellationToken cancellationToken)
    {
        return SetStatus(tripId, TripStatus.InProgress, cancellationToken);
    }

    [HttpPost("{tripId:guid}/complete")]
    [EnableRateLimiting("trips")]
    public Task<ActionResult<TripResponse>> Complete(Guid tripId, CancellationToken cancellationToken)
    {
        return SetStatus(tripId, TripStatus.Completed, cancellationToken);
    }

    [HttpPost("{tripId:guid}/cancel")]
    [EnableRateLimiting("trips")]
    public Task<ActionResult<TripResponse>> Cancel(Guid tripId, CancellationToken cancellationToken)
    {
        return SetStatus(tripId, TripStatus.Cancelled, cancellationToken);
    }

    [HttpPatch("{tripId:guid}/status")]
    [EnableRateLimiting("trips")]
    public async Task<ActionResult<TripResponse>> UpdateStatus(Guid tripId, UpdateTripStatusRequest request, CancellationToken cancellationToken)
    {
        return await SetStatus(tripId, request.Status, cancellationToken);
    }

    private async Task<ActionResult<TripResponse>> SetStatus(Guid tripId, TripStatus status, CancellationToken cancellationToken)
    {
        var trip = await db.Trips.FindAsync([tripId], cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        trip.Status = status;
        var now = DateTimeOffset.UtcNow;

        if (status == TripStatus.InProgress)
        {
            trip.StartedAtUtc = now;
        }
        else if (status == TripStatus.Completed)
        {
            trip.CompletedAtUtc = now;
            trip.FinalFare ??= trip.EstimatedFare;
            if (trip.PreferredPaymentMethod == PaymentMethod.Cash)
            {
                await UpsertTripPaymentAsync(trip, PaymentStatus.Paid, cancellationToken);
            }
        }
        else if (status == TripStatus.Cancelled)
        {
            trip.CancelledAtUtc = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        var updatedTrip = await LoadTripAsync(trip.Id, cancellationToken);
        await notifications.NotifyTripUpdatedAsync(updatedTrip);
        return Ok(ToResponse(updatedTrip));
    }

    private async Task<Trip> LoadTripAsync(Guid tripId, CancellationToken cancellationToken)
    {
        return await db.Trips
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.User)
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.Vehicles)
            .FirstAsync(x => x.Id == tripId, cancellationToken);
    }

    private async Task UpsertTripPaymentAsync(Trip trip, PaymentStatus status, CancellationToken cancellationToken)
    {
        var payment = await db.Payments.FirstOrDefaultAsync(x => x.TripId == trip.Id, cancellationToken);
        DateTimeOffset? paidAt = status == PaymentStatus.Paid ? DateTimeOffset.UtcNow : null;
        var amount = trip.FinalFare ?? trip.EstimatedFare;

        if (payment is null)
        {
            db.Payments.Add(new Payment
            {
                TripId = trip.Id,
                Method = trip.PreferredPaymentMethod,
                Status = status,
                Amount = amount,
                PaidAtUtc = paidAt
            });
            return;
        }

        payment.Method = trip.PreferredPaymentMethod;
        payment.Status = status;
        payment.Amount = amount;
        payment.PaidAtUtc = paidAt ?? payment.PaidAtUtc;
    }

    private static TripResponse ToResponse(Trip trip)
    {
        var vehicle = trip.DriverProfile?.Vehicles.FirstOrDefault(x => x.IsActive) ?? trip.DriverProfile?.Vehicles.FirstOrDefault();
        var driver = trip.DriverProfile is null
            ? null
            : new DriverSummaryResponse(
                trip.DriverProfile.Id,
                trip.DriverProfile.UserId,
                trip.DriverProfile.User.DisplayName ?? "Rydo Driver",
                trip.DriverProfile.RatingAverage,
                trip.DriverProfile.IsVerified,
                trip.DriverProfile.PhotoUrl,
                vehicle is null ? null : $"{vehicle.Make} {vehicle.Model}".Trim(),
                vehicle?.Colour,
                vehicle?.NumberPlate);

        return new TripResponse(
            trip.Id,
            trip.Status,
            trip.RideType,
            trip.PickupAddress,
            trip.DestinationAddress,
            trip.EstimatedFare,
            trip.PreferredPaymentMethod,
            trip.DriverProfileId,
            driver);
    }

    private static TripListItemResponse ToListItem(Trip trip)
    {
        return new TripListItemResponse(
            trip.Id,
            trip.Status,
            trip.RideType,
            trip.PickupAddress,
            trip.DestinationAddress,
            trip.FinalFare ?? trip.EstimatedFare,
            trip.PreferredPaymentMethod,
            trip.RequestedAtUtc,
            trip.CompletedAtUtc);
    }
}
