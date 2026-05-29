using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;

namespace Rydo.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public sealed class AdminController(RydoDbContext db) : ControllerBase
{
    [HttpGet("live-map")]
    public async Task<ActionResult> LiveMap(CancellationToken cancellationToken)
    {
        var drivers = await db.DriverLocations
            .Join(db.Drivers, location => location.DriverProfileId, driver => driver.Id, (location, driver) => new
            {
                driver.Id,
                driver.IsOnline,
                driver.IsVerified,
                driver.RatingAverage,
                latitude = location.Position.Y,
                longitude = location.Position.X,
                location.Heading,
                location.RecordedAtUtc
            })
            .ToListAsync(cancellationToken);

        var activeTrips = await db.Trips
            .Where(x => x.Status != Domain.TripStatus.Completed && x.Status != Domain.TripStatus.Cancelled)
            .Select(x => new
            {
                x.Id,
                x.Status,
                x.DriverProfileId,
                pickupLatitude = x.PickupPoint.Y,
                pickupLongitude = x.PickupPoint.X,
                destinationLatitude = x.DestinationPoint.Y,
                destinationLongitude = x.DestinationPoint.X
            })
            .ToListAsync(cancellationToken);

        return Ok(new { drivers, activeTrips });
    }
}
