using Microsoft.EntityFrameworkCore;
using Rydo.Api.Data;
using Rydo.Api.Domain;

namespace Rydo.Api.Services;

public sealed class TripMaintenanceService(IServiceScopeFactory scopeFactory, ILogger<TripMaintenanceService> logger, IConfiguration configuration) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = configuration.GetValue("BackgroundJobs:MaintenanceIntervalSeconds", 30);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(Math.Max(10, intervalSeconds)));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ExpireStuckTripsAsync(stoppingToken);
                await MarkStaleDriversOfflineAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Background trip maintenance failed.");
            }
        }
    }

    private async Task ExpireStuckTripsAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<RideNotificationService>();
        var expirySeconds = configuration.GetValue("BackgroundJobs:TripMatchExpirySeconds", 180);
        var expireBefore = DateTimeOffset.UtcNow.AddSeconds(-expirySeconds);

        var staleTrips = await db.Trips
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.User)
            .Include(x => x.DriverProfile)
                .ThenInclude(x => x!.Vehicles)
            .Where(x => (x.Status == TripStatus.Requested || x.Status == TripStatus.Matching) && x.RequestedAtUtc <= expireBefore)
            .Take(25)
            .ToListAsync(cancellationToken);

        if (staleTrips.Count == 0)
        {
            return;
        }

        foreach (var trip in staleTrips)
        {
            trip.Status = TripStatus.Expired;
            trip.CancelledAtUtc = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
        foreach (var trip in staleTrips)
        {
            await notifications.NotifyTripUpdatedAsync(trip);
        }
    }

    private async Task MarkStaleDriversOfflineAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<RydoDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<RideNotificationService>();
        var staleSeconds = configuration.GetValue("BackgroundJobs:DriverLocationStaleSeconds", 180);
        var staleBefore = DateTimeOffset.UtcNow.AddSeconds(-staleSeconds);

        var staleDriverIds = await db.DriverLocations
            .Where(x => x.RecordedAtUtc <= staleBefore)
            .Join(db.Drivers.Where(x => x.IsOnline), location => location.DriverProfileId, driver => driver.Id, (_, driver) => driver.Id)
            .Take(50)
            .ToListAsync(cancellationToken);

        if (staleDriverIds.Count == 0)
        {
            return;
        }

        var staleDrivers = await db.Drivers
            .Where(x => staleDriverIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        foreach (var driver in staleDrivers)
        {
            driver.IsOnline = false;
        }

        await db.SaveChangesAsync(cancellationToken);
        foreach (var driverId in staleDriverIds)
        {
            await notifications.NotifyDriverAvailabilityAsync(driverId, false);
        }
    }
}
