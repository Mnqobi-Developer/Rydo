using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rydo.Api.Contracts;
using Rydo.Api.Data;
using Rydo.Api.Domain;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(RydoDbContext db, JwtTokenService tokens) : ControllerBase
{
    [HttpPost("otp/request")]
    public ActionResult RequestOtp(RequestOtpRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return BadRequest(new { error = "Phone number is required." });
        }

        // MVP placeholder. Replace with SMS provider integration before production.
        return Accepted(new { request.PhoneNumber, expiresInSeconds = 300, developmentCode = "123456" });
    }

    [HttpPost("otp/verify")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        if (request.Code != "123456")
        {
            return Unauthorized(new { error = "Invalid OTP code." });
        }

        var phone = request.PhoneNumber.Trim();
        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phone, cancellationToken);

        if (user is null)
        {
            user = new AppUser
            {
                PhoneNumber = phone,
                DisplayName = displayName,
                Email = email,
                Role = request.Role,
                IsPhoneVerified = true
            };

            db.Users.Add(user);
        }
        else
        {
            user.IsPhoneVerified = true;
            user.Role = request.Role;
            user.DisplayName = displayName ?? user.DisplayName;
            user.Email = email ?? user.Email;
        }

        await db.SaveChangesAsync(cancellationToken);

        Guid? driverProfileId = null;
        if (user.Role == UserRole.Driver)
        {
            var driver = await db.Drivers
                .Include(x => x.Vehicles)
                .FirstOrDefaultAsync(x => x.UserId == user.Id, cancellationToken);

            if (driver is null)
            {
                driver = new DriverProfile
                {
                    UserId = user.Id,
                    IsVerified = true,
                    RatingAverage = 4.8m,
                    RatingCount = 12
                };

                driver.Vehicles.Add(new Vehicle
                {
                    Make = "Toyota",
                    Model = "Corolla",
                    Colour = "White",
                    NumberPlate = "CAA 123 GP",
                    SupportedRideType = RideType.RydoGo
                });

                db.Drivers.Add(driver);
                await db.SaveChangesAsync(cancellationToken);
            }

            driverProfileId = driver.Id;
        }

        return Ok(new AuthResponse(user.Id, user.Role, tokens.CreateToken(user), driverProfileId, user.DisplayName, user.Email));
    }
}
