using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Rydo.Api.Data;

namespace Rydo.Api.Services;

public sealed class DriverMatchingService(RydoDbContext db, IConfiguration configuration)
{
    public async Task<IReadOnlyList<Guid>> FindNearbyDriversAsync(Point pickupPoint, CancellationToken cancellationToken)
    {
        var matching = configuration.GetSection("DriverMatching");
        var radiusMeters = matching.GetValue("InitialRadiusMeters", 3000);
        var freshnessSeconds = matching.GetValue("LocationFreshnessSeconds", 45);
        var freshAfter = DateTimeOffset.UtcNow.AddSeconds(-freshnessSeconds);

        return await db.DriverLocations
            .Where(x => x.RecordedAtUtc >= freshAfter)
            .Where(x => x.Position.IsWithinDistance(pickupPoint, radiusMeters))
            .Join(
                db.Drivers.Where(x => x.IsOnline && x.IsVerified),
                location => location.DriverProfileId,
                driver => driver.Id,
                (location, driver) => new
                {
                    DriverId = driver.Id,
                    Distance = location.Position.Distance(pickupPoint),
                    Rating = driver.RatingAverage
                })
            .OrderBy(x => x.Distance)
            .ThenByDescending(x => x.Rating)
            .Select(x => x.DriverId)
            .Take(8)
            .ToListAsync(cancellationToken);
    }
}
