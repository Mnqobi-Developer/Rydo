using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        var trip = await db.Trips.FindAsync([tripId], cancellationToken);
        return trip is null ? NotFound() : Ok(ToResponse(trip));
    }

    [HttpPost("{tripId:guid}/accept")]
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

        trip.DriverProfileId = request.DriverProfileId;
        trip.Status = TripStatus.DriverAssigned;
        trip.AcceptedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await notifications.NotifyTripUpdatedAsync(trip);
        return Ok(ToResponse(trip));
    }

    [HttpPatch("{tripId:guid}/status")]
    public async Task<ActionResult<TripResponse>> UpdateStatus(Guid tripId, UpdateTripStatusRequest request, CancellationToken cancellationToken)
    {
        var trip = await db.Trips.FindAsync([tripId], cancellationToken);
        if (trip is null)
        {
            return NotFound();
        }

        trip.Status = request.Status;
        var now = DateTimeOffset.UtcNow;

        if (request.Status == TripStatus.InProgress)
        {
            trip.StartedAtUtc = now;
        }
        else if (request.Status == TripStatus.Completed)
        {
            trip.CompletedAtUtc = now;
            trip.FinalFare ??= trip.EstimatedFare;
        }
        else if (request.Status == TripStatus.Cancelled)
        {
            trip.CancelledAtUtc = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        await notifications.NotifyTripUpdatedAsync(trip);
        return Ok(ToResponse(trip));
    }

    private static TripResponse ToResponse(Trip trip)
    {
        return new TripResponse(
            trip.Id,
            trip.Status,
            trip.RideType,
            trip.PickupAddress,
            trip.DestinationAddress,
            trip.EstimatedFare,
            trip.DriverProfileId);
    }
}
