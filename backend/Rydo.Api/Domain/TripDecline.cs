namespace Rydo.Api.Domain;

public sealed class TripDecline
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public Guid DriverProfileId { get; set; }
    public DriverProfile DriverProfile { get; set; } = null!;
    public DateTimeOffset DeclinedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
