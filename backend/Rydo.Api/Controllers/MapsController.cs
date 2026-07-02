using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Rydo.Api.Contracts;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/maps")]
public sealed class MapsController(GoogleMapsService maps) : ControllerBase
{
    [HttpGet("autocomplete")]
    [EnableRateLimiting("maps")]
    public async Task<ActionResult<IReadOnlyList<PlaceSuggestion>>> Autocomplete(
        [FromQuery] string input,
        [FromQuery] double? latitude,
        [FromQuery] double? longitude,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input) || input.Trim().Length < 3)
        {
            return Ok(Array.Empty<PlaceSuggestion>());
        }

        return Ok(await maps.AutocompleteAsync(input.Trim(), latitude, longitude, cancellationToken));
    }

    [HttpGet("places/{placeId}")]
    [EnableRateLimiting("maps")]
    public async Task<ActionResult<PlaceDetails>> GetPlace(string placeId, CancellationToken cancellationToken)
    {
        var place = await maps.GetPlaceAsync(placeId, cancellationToken);
        return place is null ? NotFound() : Ok(place);
    }

    [HttpPost("routes")]
    [EnableRateLimiting("maps")]
    public async Task<ActionResult<RouteEstimate>> ComputeRoute(
        ComputeRouteRequest request,
        CancellationToken cancellationToken)
    {
        var route = await maps.ComputeRouteAsync(
            request.OriginLatitude,
            request.OriginLongitude,
            request.DestinationLatitude,
            request.DestinationLongitude,
            request.RideType,
            cancellationToken);

        return route is null ? NotFound(new { error = "No route found." }) : Ok(route);
    }
}
