using Rydo.Api.Domain;

namespace Rydo.Api.Contracts;

public sealed record CreateTripRequest(
    Guid PassengerId,
    RideType RideType,
    string PickupAddress,
    double PickupLatitude,
    double PickupLongitude,
    string DestinationAddress,
    double DestinationLatitude,
    double DestinationLongitude,
    int? EstimatedDistanceMeters,
    int? EstimatedDurationSeconds);

public sealed record TripResponse(
    Guid TripId,
    TripStatus Status,
    RideType RideType,
    string PickupAddress,
    string DestinationAddress,
    decimal EstimatedFare,
    Guid? DriverProfileId);

public sealed record UpdateTripStatusRequest(TripStatus Status);
public sealed record AcceptTripRequest(Guid DriverProfileId);
