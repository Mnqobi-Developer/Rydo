using NetTopologySuite.Geometries;

namespace Rydo.Api.Domain;

public sealed class Trip
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PassengerId { get; set; }
    public Guid? DriverProfileId { get; set; }
    public DriverProfile? DriverProfile { get; set; }
    public RideType RideType { get; set; } = RideType.RydoGo;
    public PaymentMethod PreferredPaymentMethod { get; set; } = PaymentMethod.Cash;
    public TripStatus Status { get; set; } = TripStatus.Requested;
    public string PickupAddress { get; set; } = string.Empty;
    public Point PickupPoint { get; set; } = null!;
    public string DestinationAddress { get; set; } = string.Empty;
    public Point DestinationPoint { get; set; } = null!;
    public decimal EstimatedFare { get; set; }
    public decimal? FinalFare { get; set; }
    public int? EstimatedDistanceMeters { get; set; }
    public int? EstimatedDurationSeconds { get; set; }
    public DateTimeOffset RequestedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? AcceptedAtUtc { get; set; }
    public DateTimeOffset? StartedAtUtc { get; set; }
    public DateTimeOffset? CompletedAtUtc { get; set; }
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public ICollection<TripDecline> Declines { get; set; } = [];
}

public enum RideType
{
    RydoGo = 1,
    RydoXl = 2,
    RydoComfort = 3,
    RydoLocal = 4
}

public enum TripStatus
{
    Requested = 1,
    Matching = 2,
    DriverAssigned = 3,
    DriverArriving = 4,
    InProgress = 5,
    Completed = 6,
    Cancelled = 7,
    Expired = 8
}
