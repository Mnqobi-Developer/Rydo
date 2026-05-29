namespace Rydo.Api.Contracts;

public sealed record UpdateDriverLocationRequest(
    double Latitude,
    double Longitude,
    double? Heading,
    double? SpeedMetersPerSecond);

public sealed record SetDriverAvailabilityRequest(bool IsOnline);
