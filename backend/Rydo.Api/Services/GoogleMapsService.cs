namespace Rydo.Api.Services;

public sealed class GoogleMapsService(IConfiguration configuration, HttpClient httpClient)
{
    public bool IsConfigured => !string.IsNullOrWhiteSpace(configuration["GoogleMaps:ApiKey"]);

    public Task<DistanceEstimate?> GetDistanceEstimateAsync(
        double originLatitude,
        double originLongitude,
        double destinationLatitude,
        double destinationLongitude,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured)
        {
            return Task.FromResult<DistanceEstimate?>(null);
        }

        // Wire this to Google Distance Matrix API before production pricing is enabled.
        return Task.FromResult<DistanceEstimate?>(null);
    }
}

public sealed record DistanceEstimate(int DistanceMeters, int DurationSeconds);
