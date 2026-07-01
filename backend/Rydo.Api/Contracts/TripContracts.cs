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
    int? EstimatedDurationSeconds,
    PaymentMethod PreferredPaymentMethod = PaymentMethod.Cash);

public sealed record TripResponse(
    Guid TripId,
    TripStatus Status,
    RideType RideType,
    string PickupAddress,
    string DestinationAddress,
    decimal EstimatedFare,
    PaymentMethod PreferredPaymentMethod,
    Guid? DriverProfileId,
    DriverSummaryResponse? Driver);

public sealed record DriverSummaryResponse(
    Guid DriverProfileId,
    Guid UserId,
    string Name,
    decimal RatingAverage,
    bool IsVerified,
    string? PhotoUrl,
    string? VehicleModel,
    string? VehicleColour,
    string? NumberPlate);

public sealed record TripListItemResponse(
    Guid TripId,
    TripStatus Status,
    RideType RideType,
    string PickupAddress,
    string DestinationAddress,
    decimal Fare,
    PaymentMethod PreferredPaymentMethod,
    DateTimeOffset RequestedAtUtc,
    DateTimeOffset? CompletedAtUtc);

public sealed record UpdateTripStatusRequest(TripStatus Status);
public sealed record AcceptTripRequest(Guid DriverProfileId);
