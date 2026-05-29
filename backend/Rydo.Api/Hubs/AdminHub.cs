using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Rydo.Api.Hubs;

[Authorize(Roles = "Admin")]
public sealed class AdminHub : Hub
{
    public const string LiveMapGroup = "admin:live-map";

    public Task JoinLiveMap()
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, LiveMapGroup);
    }
}
