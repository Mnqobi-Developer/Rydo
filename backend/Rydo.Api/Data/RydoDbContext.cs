using Microsoft.EntityFrameworkCore;
using Rydo.Api.Domain;

namespace Rydo.Api.Data;

public sealed class RydoDbContext(DbContextOptions<RydoDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<DriverProfile> Drivers => Set<DriverProfile>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<DriverLocation> DriverLocations => Set<DriverLocation>();
    public DbSet<RoutePoint> RouteHistory => Set<RoutePoint>();
    public DbSet<Rating> Ratings => Set<Rating>();
    public DbSet<Dispute> Disputes => Set<Dispute>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasIndex(x => x.PhoneNumber).IsUnique();
            entity.HasIndex(x => x.Email).IsUnique().HasFilter("\"Email\" IS NOT NULL");
            entity.Property(x => x.PhoneNumber).HasMaxLength(32);
            entity.Property(x => x.DisplayName).HasMaxLength(120);
            entity.Property(x => x.Email).HasMaxLength(254);
        });

        modelBuilder.Entity<DriverProfile>(entity =>
        {
            entity.HasIndex(x => x.UserId).IsUnique();
            entity.HasOne(x => x.User).WithOne(x => x.DriverProfile).HasForeignKey<DriverProfile>(x => x.UserId);
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.HasIndex(x => x.DriverProfileId);
            entity.Property(x => x.NumberPlate).HasMaxLength(32);
        });

        modelBuilder.Entity<Trip>(entity =>
        {
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.RequestedAtUtc);
            entity.Property(x => x.PickupPoint).HasColumnType("geography(Point,4326)");
            entity.Property(x => x.DestinationPoint).HasColumnType("geography(Point,4326)");
            entity.Property(x => x.EstimatedFare).HasPrecision(12, 2);
            entity.Property(x => x.FinalFare).HasPrecision(12, 2);
            entity.Property(x => x.PreferredPaymentMethod).HasDefaultValue(PaymentMethod.Cash);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasIndex(x => x.TripId).IsUnique();
            entity.Property(x => x.Amount).HasPrecision(12, 2);
        });

        modelBuilder.Entity<DriverLocation>(entity =>
        {
            entity.HasIndex(x => x.DriverProfileId).IsUnique();
            entity.HasIndex(x => x.RecordedAtUtc);
            entity.Property(x => x.Position).HasColumnType("geography(Point,4326)");
        });

        modelBuilder.Entity<RoutePoint>(entity =>
        {
            entity.HasIndex(x => new { x.TripId, x.RecordedAtUtc });
            entity.Property(x => x.Position).HasColumnType("geography(Point,4326)");
        });
    }
}
