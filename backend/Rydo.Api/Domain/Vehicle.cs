namespace Rydo.Api.Domain;

public sealed class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DriverProfileId { get; set; }
    public DriverProfile DriverProfile { get; set; } = null!;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Colour { get; set; } = string.Empty;
    public string NumberPlate { get; set; } = string.Empty;
    public RideType SupportedRideType { get; set; } = RideType.RydoGo;
    public bool IsActive { get; set; } = true;
}
