using NetTopologySuite.Geometries;

namespace Rydo.Api.Domain;

public sealed class DriverLocation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DriverProfileId { get; set; }
    public Point Position { get; set; } = null!;
    public double? Heading { get; set; }
    public double? SpeedMetersPerSecond { get; set; }
    public DateTimeOffset RecordedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
