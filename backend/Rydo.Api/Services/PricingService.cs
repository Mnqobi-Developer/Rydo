using Rydo.Api.Domain;

namespace Rydo.Api.Services;

public sealed class PricingService(IConfiguration configuration)
{
    public decimal EstimateFare(RideType rideType, int? distanceMeters, int? durationSeconds)
    {
        var pricing = configuration.GetSection("Pricing");
        var baseFare = pricing.GetValue("BaseFare", 18.00m);
        var perKilometer = pricing.GetValue("PerKilometer", 8.50m);
        var perMinute = pricing.GetValue("PerMinute", 1.25m);
        var minimumFare = pricing.GetValue("MinimumFare", 35.00m);

        var kilometers = Math.Max(0, distanceMeters ?? 0) / 1000m;
        var minutes = Math.Max(0, durationSeconds ?? 0) / 60m;
        var multiplier = rideType switch
        {
            RideType.RydoXl => 1.35m,
            RideType.RydoComfort => 1.65m,
            RideType.RydoLocal => 0.9m,
            _ => 1.0m
        };

        var fare = (baseFare + kilometers * perKilometer + minutes * perMinute) * multiplier;
        return Math.Round(Math.Max(minimumFare, fare), 2);
    }
}
