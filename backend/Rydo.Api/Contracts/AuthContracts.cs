using Rydo.Api.Domain;

namespace Rydo.Api.Contracts;

public enum OtpChannel
{
    Phone = 1,
    Email = 2
}

public sealed record RequestOtpRequest(string? PhoneNumber = null, UserRole Role = UserRole.Passenger, string? Email = null, OtpChannel Channel = OtpChannel.Phone);
public sealed record VerifyOtpRequest(string Code, UserRole Role = UserRole.Passenger, string? PhoneNumber = null, string? DisplayName = null, string? Email = null, OtpChannel Channel = OtpChannel.Phone);
public sealed record AuthResponse(Guid UserId, UserRole Role, string AccessToken, Guid? DriverProfileId, string? DisplayName, string? Email);
