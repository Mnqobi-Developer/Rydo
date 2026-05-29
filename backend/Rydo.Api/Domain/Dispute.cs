namespace Rydo.Api.Domain;

public sealed class Dispute
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TripId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DisputeStatus Status { get; set; } = DisputeStatus.Open;
    public string Reason { get; set; } = string.Empty;
    public string? ResolutionNotes { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAtUtc { get; set; }
}

public enum DisputeStatus
{
    Open = 1,
    InReview = 2,
    Resolved = 3,
    Rejected = 4
}
