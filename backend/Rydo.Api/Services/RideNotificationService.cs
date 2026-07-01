using Microsoft.AspNetCore.SignalR;
using Rydo.Api.Domain;
using Rydo.Api.Hubs;

namespace Rydo.Api.Services;

public sealed class RideNotificationService(IHubContext<RideHub> rides, IHubContext<AdminHub> admin)
{
    public Task NotifyTripUpdatedAsync(Trip trip)
    {
        var vehicle = trip.DriverProfile?.Vehicles.FirstOrDefault(x => x.IsActive) ?? trip.DriverProfile?.Vehicles.FirstOrDefault();
        var driver = trip.DriverProfile is null
            ? null
            : new
            {
                DriverProfileId = trip.DriverProfile.Id,
                UserId = trip.DriverProfile.UserId,
                Name = trip.DriverProfile.User.DisplayName ?? "Rydo Driver",
                trip.DriverProfile.RatingAverage,
                trip.DriverProfile.IsVerified,
                trip.DriverProfile.PhotoUrl,
                VehicleModel = vehicle is null ? null : $"{vehicle.Make} {vehicle.Model}".Trim(),
                VehicleColour = vehicle?.Colour,
                vehicle?.NumberPlate
            };

        var payload = new
        {
            TripId = trip.Id,
            trip.Id,
            trip.PassengerId,
            trip.DriverProfileId,
            trip.Status,
            trip.EstimatedFare,
            trip.PreferredPaymentMethod,
            trip.PickupAddress,
            trip.DestinationAddress,
            Driver = driver
        };

        return Task.WhenAll(
            rides.Clients.Group(RideHub.TripGroup(trip.Id)).SendAsync("trip.updated", payload),
            admin.Clients.Group(AdminHub.LiveMapGroup).SendAsync("trip.updated", payload));
    }

    public Task NotifyDriverRequestAsync(Guid driverProfileId, Trip trip)
    {
        return rides.Clients.Group(RideHub.DriverGroup(driverProfileId)).SendAsync("ride.requested", new
        {
            TripId = trip.Id,
            trip.Id,
            trip.PassengerId,
            trip.PickupAddress,
            trip.DestinationAddress,
            trip.EstimatedFare,
            trip.PreferredPaymentMethod,
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

    public Task NotifyDriverAvailabilityAsync(Guid driverProfileId, bool isOnline)
    {
        return admin.Clients.Group(AdminHub.LiveMapGroup).SendAsync("driver.availability", new
        {
            driverProfileId,
            isOnline,
            recordedAtUtc = DateTimeOffset.UtcNow
        });
    }
}
