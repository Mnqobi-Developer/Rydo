namespace Rydo.Api.Domain;

public sealed class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PhoneNumber { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    public UserRole Role { get; set; } = UserRole.Passenger;
    public bool IsPhoneVerified { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
    public DriverProfile? DriverProfile { get; set; }
}

public enum UserRole
{
    Passenger = 1,
    Driver = 2,
    Admin = 3
}
