namespace Rydo.Api.Contracts;

public sealed record CreateRatingRequest(Guid TripId, Guid FromUserId, Guid ToUserId, int Stars, string[] Tags, string? Comment);
