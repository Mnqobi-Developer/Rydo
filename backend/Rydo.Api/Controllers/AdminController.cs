using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Domain;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public sealed class AdminController(RydoDbContext db, RideNotificationService notifications) : ControllerBase
{
    public sealed record AdminUpdateDriverVerificationRequest(bool IsVerified);
    public sealed record AdminUpdateDisputeRequest(DisputeStatus Status, string? ResolutionNotes);
    public sealed record AdminUpdatePaymentStatusRequest(PaymentStatus Status);

    [HttpGet("overview")]
    public async Task<ActionResult> Overview(CancellationToken cancellationToken)
    {
        var today = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var activeStatuses = new[]
        {
            Domain.TripStatus.Matching,
            Domain.TripStatus.DriverAssigned,
            Domain.TripStatus.DriverArriving,
            Domain.TripStatus.InProgress
        };

        var totalUsers = await db.Users.CountAsync(cancellationToken);
        var totalDrivers = await db.Drivers.CountAsync(cancellationToken);
        var onlineDrivers = await db.Drivers.CountAsync(x => x.IsOnline, cancellationToken);
        var activeTrips = await db.Trips.CountAsync(x => activeStatuses.Contains(x.Status), cancellationToken);
        var completedToday = await db.Trips.CountAsync(x => x.Status == Domain.TripStatus.Completed && x.CompletedAtUtc >= today, cancellationToken);
        var pendingDisputes = await db.Disputes.CountAsync(x => x.Status == Domain.DisputeStatus.Open || x.Status == Domain.DisputeStatus.InReview, cancellationToken);
        var paidToday = await db.Payments
            .Where(x => x.Status == Domain.PaymentStatus.Paid && x.PaidAtUtc >= today)
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var recentTrips = await db.Trips
            .OrderByDescending(x => x.RequestedAtUtc)
            .Take(8)
            .Select(x => new
            {
                x.Id,
                x.Status,
                x.RideType,
                x.PickupAddress,
                x.DestinationAddress,
                fare = x.FinalFare ?? x.EstimatedFare,
                x.PreferredPaymentMethod,
                x.RequestedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            totalUsers,
            totalDrivers,
            onlineDrivers,
            activeTrips,
            completedToday,
            pendingDisputes,
            paidToday,
            recentTrips
        });
    }

    [HttpGet("users")]
    public async Task<ActionResult> Users(CancellationToken cancellationToken)
    {
        var users = await db.Users
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.DisplayName,
                x.PhoneNumber,
                x.Email,
                x.Role,
                x.IsPhoneVerified,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpGet("drivers")]
    public async Task<ActionResult> Drivers(CancellationToken cancellationToken)
    {
        var drivers = await db.Drivers
            .Include(x => x.User)
            .Include(x => x.Vehicles)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.UserId,
                name = x.User.DisplayName,
                x.User.PhoneNumber,
                x.IsOnline,
                x.IsVerified,
                x.RatingAverage,
                x.RatingCount,
                vehicle = x.Vehicles
                    .OrderByDescending(vehicle => vehicle.IsActive)
                    .Select(vehicle => new
                    {
                        vehicle.Make,
                        vehicle.Model,
                        vehicle.Colour,
                        vehicle.NumberPlate,
                        vehicle.IsActive
                    })
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        return Ok(drivers);
    }

    [HttpGet("drivers/{driverProfileId:guid}")]
    public async Task<ActionResult> DriverDetail(Guid driverProfileId, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers
            .Include(x => x.User)
            .Include(x => x.Vehicles)
            .FirstOrDefaultAsync(x => x.Id == driverProfileId, cancellationToken);

        if (driver is null)
        {
            return NotFound();
        }

        var trips = await db.Trips
            .Where(x => x.DriverProfileId == driverProfileId)
            .OrderByDescending(x => x.RequestedAtUtc)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.Status,
                x.RideType,
                x.PickupAddress,
                x.DestinationAddress,
                fare = x.FinalFare ?? x.EstimatedFare,
                x.RequestedAtUtc,
                x.CompletedAtUtc,
                x.CancelledAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            driver.Id,
            driver.UserId,
            name = driver.User.DisplayName,
            driver.User.PhoneNumber,
            driver.User.Email,
            driver.IsOnline,
            driver.IsVerified,
            driver.RatingAverage,
            driver.RatingCount,
            driver.CreatedAtUtc,
            vehicles = driver.Vehicles.Select(vehicle => new
            {
                vehicle.Id,
                vehicle.Make,
                vehicle.Model,
                vehicle.Colour,
                vehicle.NumberPlate,
                vehicle.SupportedRideType,
                vehicle.IsActive
            }),
            trips
        });
    }

    [HttpPatch("drivers/{driverProfileId:guid}/verification")]
    public async Task<ActionResult> UpdateDriverVerification(Guid driverProfileId, AdminUpdateDriverVerificationRequest request, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers.FindAsync([driverProfileId], cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        driver.IsVerified = request.IsVerified;
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("drivers/{driverProfileId:guid}/offline")]
    public async Task<ActionResult> SetDriverOffline(Guid driverProfileId, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers.FindAsync([driverProfileId], cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        driver.IsOnline = false;
        await db.SaveChangesAsync(cancellationToken);
        await notifications.NotifyDriverAvailabilityAsync(driverProfileId, false);

        return NoContent();
    }

    [HttpGet("trips")]
    public async Task<ActionResult> Trips(CancellationToken cancellationToken)
    {
        var trips = await db.Trips
            .OrderByDescending(x => x.RequestedAtUtc)
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.PassengerId,
                x.DriverProfileId,
                x.Status,
                x.RideType,
                x.PickupAddress,
                x.DestinationAddress,
                fare = x.FinalFare ?? x.EstimatedFare,
                x.PreferredPaymentMethod,
                x.RequestedAtUtc,
                x.CompletedAtUtc,
                x.CancelledAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(trips);
    }

    [HttpGet("trips/{tripId:guid}")]
    public async Task<ActionResult> TripDetail(Guid tripId, CancellationToken cancellationToken)
    {
        var trip = await db.Trips
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.User)
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.Vehicles)
            .FirstOrDefaultAsync(x => x.Id == tripId, cancellationToken);

        if (trip is null)
        {
            return NotFound();
        }

        var passenger = await db.Users
            .Where(x => x.Id == trip.PassengerId)
            .Select(x => new { x.Id, x.DisplayName, x.PhoneNumber, x.Email })
            .FirstOrDefaultAsync(cancellationToken);

        var payment = await db.Payments
            .Where(x => x.TripId == trip.Id)
            .Select(x => new
            {
                x.Id,
                x.Method,
                x.Status,
                x.Amount,
                x.Currency,
                x.ProviderReference,
                x.CreatedAtUtc,
                x.PaidAtUtc
            })
            .FirstOrDefaultAsync(cancellationToken);

        var disputes = await db.Disputes
            .Where(x => x.TripId == trip.Id)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.Id,
                x.Status,
                x.Reason,
                x.ResolutionNotes,
                x.CreatedAtUtc,
                x.ResolvedAtUtc
            })
            .ToListAsync(cancellationToken);

        var vehicle = trip.DriverProfile?.Vehicles.FirstOrDefault(x => x.IsActive) ?? trip.DriverProfile?.Vehicles.FirstOrDefault();
        var timeline = new[]
        {
            new { label = "Requested", atUtc = (DateTimeOffset?)trip.RequestedAtUtc },
            new { label = "Accepted", atUtc = trip.AcceptedAtUtc },
            new { label = "Started", atUtc = trip.StartedAtUtc },
            new { label = "Completed", atUtc = trip.CompletedAtUtc },
            new { label = "Cancelled", atUtc = trip.CancelledAtUtc }
        }.Where(x => x.atUtc is not null);

        return Ok(new
        {
            trip.Id,
            trip.Status,
            trip.RideType,
            trip.PickupAddress,
            trip.DestinationAddress,
            trip.EstimatedFare,
            trip.FinalFare,
            fare = trip.FinalFare ?? trip.EstimatedFare,
            trip.PreferredPaymentMethod,
            trip.EstimatedDistanceMeters,
            trip.EstimatedDurationSeconds,
            trip.RequestedAtUtc,
            trip.AcceptedAtUtc,
            trip.StartedAtUtc,
            trip.CompletedAtUtc,
            trip.CancelledAtUtc,
            passenger,
            driver = trip.DriverProfile is null ? null : new
            {
                trip.DriverProfile.Id,
                trip.DriverProfile.UserId,
                name = trip.DriverProfile.User.DisplayName,
                trip.DriverProfile.User.PhoneNumber,
                trip.DriverProfile.IsOnline,
                trip.DriverProfile.IsVerified,
                trip.DriverProfile.RatingAverage,
                trip.DriverProfile.RatingCount,
                vehicle = vehicle is null ? null : new
                {
                    vehicle.Make,
                    vehicle.Model,
                    vehicle.Colour,
                    vehicle.NumberPlate,
                    vehicle.SupportedRideType,
                    vehicle.IsActive
                }
            },
            payment,
            disputes,
            timeline
        });
    }

    [HttpPost("trips/{tripId:guid}/cancel")]
    public async Task<ActionResult> CancelTrip(Guid tripId, CancellationToken cancellationToken)
    {
        var trip = await db.Trips
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.User)
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.Vehicles)
            .FirstOrDefaultAsync(x => x.Id == tripId, cancellationToken);

        if (trip is null)
        {
            return NotFound();
        }

        if (trip.Status is TripStatus.Completed or TripStatus.Cancelled)
        {
            return Conflict(new { error = "Only active or stuck trips can be cancelled." });
        }

        trip.Status = TripStatus.Cancelled;
        trip.CancelledAtUtc = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        await notifications.NotifyTripUpdatedAsync(trip);

        return NoContent();
    }

    [HttpGet("payments")]
    public async Task<ActionResult> Payments(CancellationToken cancellationToken)
    {
        var payments = await db.Payments
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.TripId,
                x.Method,
                x.Status,
                x.Amount,
                x.Currency,
                x.ProviderReference,
                x.CreatedAtUtc,
                x.PaidAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(payments);
    }

    [HttpPatch("payments/{paymentId:guid}/status")]
    public async Task<ActionResult> UpdatePaymentStatus(Guid paymentId, AdminUpdatePaymentStatusRequest request, CancellationToken cancellationToken)
    {
        var payment = await db.Payments.FindAsync([paymentId], cancellationToken);
        if (payment is null)
        {
            return NotFound();
        }

        payment.Status = request.Status;
        payment.PaidAtUtc = request.Status == PaymentStatus.Paid ? DateTimeOffset.UtcNow : payment.PaidAtUtc;
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("disputes")]
    public async Task<ActionResult> Disputes(CancellationToken cancellationToken)
    {
        var disputes = await db.Disputes
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(100)
            .Select(x => new
            {
                x.Id,
                x.TripId,
                x.CreatedByUserId,
                x.Status,
                x.Reason,
                x.ResolutionNotes,
                x.CreatedAtUtc,
                x.ResolvedAtUtc
            })
            .ToListAsync(cancellationToken);

        return Ok(disputes);
    }

    [HttpPatch("disputes/{disputeId:guid}")]
    public async Task<ActionResult> UpdateDispute(Guid disputeId, AdminUpdateDisputeRequest request, CancellationToken cancellationToken)
    {
        var dispute = await db.Disputes.FindAsync([disputeId], cancellationToken);
        if (dispute is null)
        {
            return NotFound();
        }

        dispute.Status = request.Status;
        dispute.ResolutionNotes = string.IsNullOrWhiteSpace(request.ResolutionNotes) ? dispute.ResolutionNotes : request.ResolutionNotes.Trim();
        dispute.ResolvedAtUtc = request.Status is DisputeStatus.Resolved or DisputeStatus.Rejected ? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpGet("live-map")]
    public async Task<ActionResult> LiveMap(CancellationToken cancellationToken)
    {
        var driverLocations = await db.DriverLocations
            .Join(db.Drivers, location => location.DriverProfileId, driver => driver.Id, (location, driver) => new
            {
                Driver = driver,
                Location = location
            })
            .ToListAsync(cancellationToken);

        var activeTripRows = await db.Trips
            .Where(x => x.Status != Domain.TripStatus.Completed && x.Status != Domain.TripStatus.Cancelled)
            .ToListAsync(cancellationToken);

        var drivers = driverLocations.Select(row => new
        {
            row.Driver.Id,
            row.Driver.IsOnline,
            row.Driver.IsVerified,
            row.Driver.RatingAverage,
            latitude = row.Location.Position.Coordinate.Y,
            longitude = row.Location.Position.Coordinate.X,
            row.Location.Heading,
            row.Location.RecordedAtUtc
        });

        var activeTrips = activeTripRows.Select(trip => new
        {
            trip.Id,
            trip.Status,
            trip.DriverProfileId,
            pickupLatitude = trip.PickupPoint.Coordinate.Y,
            pickupLongitude = trip.PickupPoint.Coordinate.X,
            destinationLatitude = trip.DestinationPoint.Coordinate.Y,
            destinationLongitude = trip.DestinationPoint.Coordinate.X
        });

        return Ok(new { drivers, activeTrips });
    }
}
