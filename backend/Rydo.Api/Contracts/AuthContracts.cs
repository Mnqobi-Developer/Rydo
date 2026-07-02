using Rydo.Api.Domain;

namespace Rydo.Api.Contracts;

public sealed record RequestOtpRequest(string PhoneNumber, UserRole Role = UserRole.Passenger);
public sealed record VerifyOtpRequest(string PhoneNumber, string Code, UserRole Role = UserRole.Passenger, string? DisplayName = null, string? Email = null);
public sealed record AuthResponse(Guid UserId, UserRole Role, string AccessToken, Guid? DriverProfileId, string? DisplayName, string? Email);
