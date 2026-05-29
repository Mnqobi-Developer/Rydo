using Microsoft.AspNetCore.SignalR;
using Rydo.Api.Domain;
using Rydo.Api.Hubs;

namespace Rydo.Api.Services;

public sealed class RideNotificationService(IHubContext<RideHub> rides, IHubContext<AdminHub> admin)
{
    public Task NotifyTripUpdatedAsync(Trip trip)
    {
        var payload = new
        {
            trip.Id,
            trip.PassengerId,
            trip.DriverProfileId,
            trip.Status,
            trip.EstimatedFare,
            trip.PickupAddress,
            trip.DestinationAddress
        };

        return Task.WhenAll(
            rides.Clients.Group(RideHub.TripGroup(trip.Id)).SendAsync("trip.updated", payload),
            admin.Clients.Group(AdminHub.LiveMapGroup).SendAsync("trip.updated", payload));
    }

    public Task NotifyDriverRequestAsync(Guid driverProfileId, Trip trip)
    {
        return rides.Clients.Group(RideHub.DriverGroup(driverProfileId)).SendAsync("ride.requested", new
        {
            trip.Id,
            trip.PickupAddress,
            trip.DestinationAddress,
            trip.EstimatedFare,
            trip.RideType
        });
    }

    public Task NotifyDriverLocationAsync(Guid driverProfileId, double latitude, double longitude, double? heading)
    {
        var payload = new { driverProfileId, latitude, longitude, heading, recordedAtUtc = DateTimeOffset.UtcNow };

        return Task.WhenAll(
            rides.Clients.Group(RideHub.DriverGroup(driverProfileId)).SendAsync("driver.location", payload),
            admin.Clients.Group(AdminHub.LiveMapGroup).SendAsync("driver.location", payload));
    }
}
