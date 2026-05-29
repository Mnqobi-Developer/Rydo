using NetTopologySuite.Geometries;

namespace Rydo.Api.Domain;

public sealed class RoutePoint
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Guid DriverProfileId { get; set; }
    public Point Position { get; set; } = null!;
    public DateTimeOffset RecordedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
