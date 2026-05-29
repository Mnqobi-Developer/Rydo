namespace Rydo.Api.Domain;

public sealed class Rating
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }
    public int Stars { get; set; }
    public string[] Tags { get; set; } = [];
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
