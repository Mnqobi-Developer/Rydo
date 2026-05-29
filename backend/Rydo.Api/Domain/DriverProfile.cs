namespace Rydo.Api.Domain;

public sealed class DriverProfile
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;
    public string? PhotoUrl { get; set; }
    public bool IsVerified { get; set; }
    public bool IsOnline { get; set; }
    public decimal RatingAverage { get; set; } = 5.0m;
    public int RatingCount { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<Vehicle> Vehicles { get; set; } = [];
}
