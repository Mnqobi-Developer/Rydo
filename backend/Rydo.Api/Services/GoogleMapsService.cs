using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Rydo.Api.Domain;

namespace Rydo.Api.Services;

public sealed class GoogleMapsService(IConfiguration configuration, HttpClient httpClient, PricingService pricing, IMemoryCache cache)
{
    private const string PlacesBaseUrl = "https://places.googleapis.com/v1";
    private const string RoutesUrl = "https://routes.googleapis.com/directions/v2:computeRoutes";

    private string ApiKey => configuration["GoogleMaps:ApiKey"] ?? string.Empty;
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

    public async Task<IReadOnlyList<PlaceSuggestion>> AutocompleteAsync(
        string input,
        double? latitude,
        double? longitude,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var cacheKey = $"maps:autocomplete:{input.Trim().ToLowerInvariant()}:{latitude?.ToString("F4", CultureInfo.InvariantCulture)}:{longitude?.ToString("F4", CultureInfo.InvariantCulture)}";
        if (cache.TryGetValue(cacheKey, out IReadOnlyList<PlaceSuggestion>? cachedSuggestions) && cachedSuggestions is not null)
        {
            return cachedSuggestions;
        }

        var body = new PlacesAutocompleteRequest(
            input,
            ["za"],
            latitude.HasValue && longitude.HasValue
                ? new LocationBias(new Circle(new LatLng(latitude.Value, longitude.Value), 50_000))
                : null);

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{PlacesBaseUrl}/places:autocomplete")
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("X-Goog-Api-Key", ApiKey);
        request.Headers.Add(
            "X-Goog-FieldMask",
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<PlacesAutocompleteResponse>(cancellationToken: cancellationToken);
        var suggestions = result?.Suggestions
            .Where(x => x.PlacePrediction is not null)
            .Select(x => new PlaceSuggestion(
                x.PlacePrediction!.PlaceId,
                x.PlacePrediction.StructuredFormat?.MainText?.Text ?? x.PlacePrediction.Text?.Text ?? string.Empty,
                x.PlacePrediction.StructuredFormat?.SecondaryText?.Text ?? string.Empty))
            .ToList() ?? [];

        cache.Set(cacheKey, suggestions, TimeSpan.FromMinutes(configuration.GetValue("Caching:MapsAutocompleteMinutes", 10)));
        return suggestions;
    }

    public async Task<PlaceDetails?> GetPlaceAsync(string placeId, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var cacheKey = $"maps:place:{placeId}";
        if (cache.TryGetValue(cacheKey, out PlaceDetails? cachedPlace) && cachedPlace is not null)
        {
            return cachedPlace;
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{PlacesBaseUrl}/places/{Uri.EscapeDataString(placeId)}");
        request.Headers.Add("X-Goog-Api-Key", ApiKey);
        request.Headers.Add("X-Goog-FieldMask", "id,displayName,formattedAddress,location");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var place = await response.Content.ReadFromJsonAsync<GooglePlaceDetails>(cancellationToken: cancellationToken);
        var placeDetails = place?.Location is null
            ? null
            : new PlaceDetails(
                place.Id,
                place.DisplayName?.Text ?? place.FormattedAddress ?? string.Empty,
                place.FormattedAddress ?? string.Empty,
                place.Location.Latitude,
                place.Location.Longitude);

        if (placeDetails is not null)
        {
            cache.Set(cacheKey, placeDetails, TimeSpan.FromMinutes(configuration.GetValue("Caching:MapsPlaceMinutes", 60)));
        }

        return placeDetails;
    }

    public async Task<RouteEstimate?> ComputeRouteAsync(
        double originLatitude,
        double originLongitude,
        double destinationLatitude,
        double destinationLongitude,
        RideType rideType,
        CancellationToken cancellationToken)
    {
        EnsureConfigured();
        var cacheKey = string.Create(CultureInfo.InvariantCulture, $"maps:route:{originLatitude:F5}:{originLongitude:F5}:{destinationLatitude:F5}:{destinationLongitude:F5}:{(int)rideType}");
        if (cache.TryGetValue(cacheKey, out RouteEstimate? cachedRoute) && cachedRoute is not null)
        {
            return cachedRoute;
        }

        var body = new GoogleComputeRouteRequest(
            new Waypoint(new WaypointLocation(new LatLng(originLatitude, originLongitude))),
            new Waypoint(new WaypointLocation(new LatLng(destinationLatitude, destinationLongitude))),
            "DRIVE",
            "TRAFFIC_AWARE",
            false,
            "en-ZA",
            "METRIC");

        using var request = new HttpRequestMessage(HttpMethod.Post, RoutesUrl)
        {
            Content = JsonContent.Create(body)
        };
        request.Headers.Add("X-Goog-Api-Key", ApiKey);
        request.Headers.Add("X-Goog-FieldMask", "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline");

        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response, cancellationToken);

        var result = await response.Content.ReadFromJsonAsync<ComputeRouteResponse>(cancellationToken: cancellationToken);
        var route = result?.Routes.FirstOrDefault();
        if (route is null)
        {
            return null;
        }

        var durationSeconds = ParseDurationSeconds(route.Duration);
        var estimatedFare = pricing.EstimateFare(rideType, route.DistanceMeters, durationSeconds);

        var estimate = new RouteEstimate(route.DistanceMeters, durationSeconds, route.Polyline?.EncodedPolyline ?? string.Empty, estimatedFare);
        cache.Set(cacheKey, estimate, TimeSpan.FromMinutes(configuration.GetValue("Caching:MapsRouteMinutes", 10)));
        return estimate;
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
        {
            throw new GoogleMapsConfigurationException();
        }
    }

    private static int ParseDurationSeconds(string duration)
    {
        var value = duration.TrimEnd('s');
        return double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds)
            ? (int)Math.Ceiling(seconds)
            : 0;
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new GoogleMapsRequestException((int)response.StatusCode, body);
    }
}

public sealed record PlaceSuggestion(string PlaceId, string PrimaryText, string SecondaryText);
public sealed record PlaceDetails(string PlaceId, string Name, string Address, double Latitude, double Longitude);
public sealed record RouteEstimate(int DistanceMeters, int DurationSeconds, string EncodedPolyline, decimal EstimatedFare);

public sealed class GoogleMapsConfigurationException() : Exception("Google Maps API key is not configured.");
public sealed class GoogleMapsRequestException(int statusCode, string responseBody)
    : Exception($"Google Maps request failed with HTTP {statusCode}: {responseBody}");

internal sealed record PlacesAutocompleteRequest(
    string Input,
    string[] IncludedRegionCodes,
    LocationBias? LocationBias);
internal sealed record LocationBias(Circle Circle);
internal sealed record Circle(LatLng Center, double Radius);
internal sealed record LatLng(double Latitude, double Longitude);
internal sealed record Waypoint(WaypointLocation Location);
internal sealed record WaypointLocation(LatLng LatLng);
internal sealed record GoogleComputeRouteRequest(
    Waypoint Origin,
    Waypoint Destination,
    string TravelMode,
    string RoutingPreference,
    bool ComputeAlternativeRoutes,
    string LanguageCode,
    string Units);

internal sealed record PlacesAutocompleteResponse(Suggestion[] Suggestions);
internal sealed record Suggestion(PlacePrediction? PlacePrediction);
internal sealed record PlacePrediction(string PlaceId, GoogleText? Text, StructuredFormat? StructuredFormat);
internal sealed record StructuredFormat(GoogleText? MainText, GoogleText? SecondaryText);
internal sealed record GoogleText(string Text);
internal sealed record GooglePlaceDetails(string Id, GoogleText? DisplayName, string? FormattedAddress, LatLng? Location);
internal sealed record ComputeRouteResponse(GoogleRoute[] Routes);
internal sealed record GoogleRoute(int DistanceMeters, string Duration, GooglePolyline? Polyline);
internal sealed record GooglePolyline(string EncodedPolyline);
