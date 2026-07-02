using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rydo.Api.Contracts;
using Rydo.Api.Data;
using Rydo.Api.Domain;

namespace Rydo.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/ratings")]
public sealed class RatingsController(RydoDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult> Create(CreateRatingRequest request, CancellationToken cancellationToken)
    {
        if (request.Stars is < 1 or > 5)
        {
            return BadRequest(new { error = "Stars must be between 1 and 5." });
        }

        var trip = await db.Trips.FindAsync([request.TripId], cancellationToken);
        if (trip is null)
        {
            return NotFound(new { error = "Trip not found." });
        }

        if (trip.Status != TripStatus.Completed)
        {
            return Conflict(new { error = "Ratings can only be submitted for completed trips." });
        }

        db.Ratings.Add(new Rating
        {
            TripId = request.TripId,
            FromUserId = request.FromUserId,
            ToUserId = request.ToUserId,
            Stars = request.Stars,
            Tags = request.Tags,
            Comment = request.Comment
        });

        await db.SaveChangesAsync(cancellationToken);
        return Accepted();
    }
}
