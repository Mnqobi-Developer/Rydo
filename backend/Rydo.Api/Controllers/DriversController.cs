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
[Route("api/drivers")]
public sealed class DriversController(
    RydoDbContext db,
    GeometryFactory geometryFactory,
    RideNotificationService notifications) : ControllerBase
{
    [HttpPost("{driverProfileId:guid}/availability")]
    public async Task<ActionResult> SetAvailability(Guid driverProfileId, SetDriverAvailabilityRequest request, CancellationToken cancellationToken)
    {
        var driver = await db.Drivers.FindAsync([driverProfileId], cancellationToken);
        if (driver is null)
        {
            return NotFound();
        }

        driver.IsOnline = request.IsOnline;
        await db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPut("{driverProfileId:guid}/location")]
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
