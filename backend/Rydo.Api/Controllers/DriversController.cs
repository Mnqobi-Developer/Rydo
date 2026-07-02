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
[Route("api/drivers")]
public sealed class DriversController(
    RydoDbContext db,
    GeometryFactory geometryFactory,
    RideNotificationService notifications) : ControllerBase
{
    [HttpPost("{driverProfileId:guid}/availability")]
    [EnableRateLimiting("trips")]
    public async Task<ActionResult> SetAvailability(Guid driverProfileId, SetDriverAvailabilityRequest request, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers.FindAsync([driverProfileId], cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        driver.IsOnline = request.IsOnline;
        await db.SaveChangesAsync(cancellationToken);
        await notifications.NotifyDriverAvailabilityAsync(driverProfileId, request.IsOnline);
        return NoContent();
    }

    [HttpGet("{driverProfileId:guid}/status")]
    public async Task<ActionResult<DriverStatusResponse>> GetStatus(Guid driverProfileId, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers.FindAsync([driverProfileId], cancellationToken);
        return driver is null ? NotFound() : Ok(new DriverStatusResponse(driver.Id, driver.IsOnline, driver.IsVerified));
    }

    [HttpGet("{driverProfileId:guid}/summary")]
    public async Task<ActionResult<DriverSummaryStatsResponse>> GetSummary(Guid driverProfileId, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers.FindAsync([driverProfileId], cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        var today = new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero);
        var week = today.AddDays(-6);

        var completedTrips = db.Trips
            .Where(x => x.DriverProfileId == driverProfileId && x.Status == TripStatus.Completed);

        var todayTrips = await completedTrips
            .Where(x => x.CompletedAtUtc >= today)
            .ToListAsync(cancellationToken);

        var weekTrips = await completedTrips
            .Where(x => x.CompletedAtUtc >= week)
            .ToListAsync(cancellationToken);

        return Ok(new DriverSummaryStatsResponse(
            driver.Id,
            driver.IsOnline,
            todayTrips.Sum(x => x.FinalFare ?? x.EstimatedFare),
            todayTrips.Count,
            weekTrips.Sum(x => x.FinalFare ?? x.EstimatedFare),
            weekTrips.Count,
            driver.RatingAverage,
            driver.RatingCount));
    }

    [HttpGet("{driverProfileId:guid}/trips")]
    public async Task<ActionResult<IReadOnlyList<TripListItemResponse>>> GetTrips(Guid driverProfileId, CancellationToken cancellationToken)
    {
        var trips = await db.Trips
            .Where(x => x.DriverProfileId == driverProfileId)
            .OrderByDescending(x => x.RequestedAtUtc)
            .Take(20)
            .Select(x => new TripListItemResponse(
                x.Id,
                x.Status,
                x.RideType,
                x.PickupAddress,
                x.DestinationAddress,
                x.FinalFare ?? x.EstimatedFare,
                x.PreferredPaymentMethod,
                x.RequestedAtUtc,
                x.CompletedAtUtc))
            .ToListAsync(cancellationToken);

        return Ok(trips);
    }

    [HttpPut("{driverProfileId:guid}/location")]
    [EnableRateLimiting("driver-location")]
    public async Task<ActionResult> UpdateLocation(Guid driverProfileId, UpdateDriverLocationRequest request, CancellationToken cancellationToken)
    {
        var driverExists = await db.Drivers.AnyAsync(x => x.Id == driverProfileId, cancellationToken);
        if (!driverExists)
        {
            return NotFound();
        }

        var point = geometryFactory.CreatePoint(new Coordinate(request.Longitude, request.Latitude));
        var location = await db.DriverLocations.FirstOrDefaultAsync(x => x.DriverProfileId == driverProfileId, cancellationToken);

        if (location is null)
        {
            location = new DriverLocation { DriverProfileId = driverProfileId };
            db.DriverLocations.Add(location);
        }

        location.Position = point;
        location.Heading = request.Heading;
        location.SpeedMetersPerSecond = request.SpeedMetersPerSecond;
        location.RecordedAtUtc = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await notifications.NotifyDriverLocationAsync(driverProfileId, request.Latitude, request.Longitude, request.Heading);

        return NoContent();
    }
}
