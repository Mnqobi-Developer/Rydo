using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Rydo.Api.Hubs;

[Authorize]
public sealed class RideHub : Hub
{
    public static string TripGroup(Guid tripId) => $"trip:{tripId}";
    public static string DriverGroup(Guid driverProfileId) => $"driver:{driverProfileId}";

    public Task JoinTrip(Guid tripId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, TripGroup(tripId));
    }

    public Task LeaveTrip(Guid tripId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, TripGroup(tripId));
    }

    public Task JoinDriverQueue(Guid driverProfileId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, DriverGroup(driverProfileId));
    }
}
