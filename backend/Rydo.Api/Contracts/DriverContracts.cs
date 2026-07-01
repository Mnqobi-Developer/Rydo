namespace Rydo.Api.Contracts;

public sealed record UpdateDriverLocationRequest(
    double Latitude,
    double Longitude,
    double? Heading,
    double? SpeedMetersPerSecond);

public sealed record SetDriverAvailabilityRequest(bool IsOnline);

public sealed record DriverStatusResponse(Guid DriverProfileId, bool IsOnline, bool IsVerified);

public sealed record DriverSummaryStatsResponse(
    Guid DriverProfileId,
    bool IsOnline,
    decimal TodayEarnings,
    int TodayTrips,
    decimal WeekEarnings,
    int WeekTrips,
    decimal RatingAverage,
    int RatingCount);
