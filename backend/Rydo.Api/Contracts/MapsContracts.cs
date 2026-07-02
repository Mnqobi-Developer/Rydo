using Rydo.Api.Domain;

namespace Rydo.Api.Contracts;

public sealed record ComputeRouteRequest(
    double OriginLatitude,
    double OriginLongitude,
    double DestinationLatitude,
    double DestinationLongitude,
    RideType RideType = RideType.RydoGo);
