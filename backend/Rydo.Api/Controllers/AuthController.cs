using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Net.Mail;
using Rydo.Api.Contracts;
using Rydo.Api.Data;
using Rydo.Api.Domain;
using Rydo.Api.Services;

namespace Rydo.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(RydoDbContext db, JwtTokenService tokens, IConfiguration configuration, IWebHostEnvironment environment) : ControllerBase
{
    [HttpPost("otp/request")]
    [EnableRateLimiting("otp")]
    public ActionResult RequestOtp(RequestOtpRequest request)
    {
        var phone = NormalizePhone(request.PhoneNumber);
        var email = NormalizeEmail(request.Email);

        if (request.Channel == OtpChannel.Email)
        {
            if (!IsValidEmail(email))
            {
                return BadRequest(new { error = "A valid email address is required." });
            }

            // MVP placeholder. Replace with an email provider such as SendGrid, SES, or Postmark before production.
            return Accepted(new { email, channel = request.Channel, expiresInSeconds = 300, developmentCode = "123456" });
        }

        if (string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(new { error = "Phone number is required." });
        }

        // MVP placeholder. Replace with SMS provider integration before production.
        return Accepted(new { phoneNumber = phone, channel = request.Channel, expiresInSeconds = 300, developmentCode = "123456" });
    }

    [HttpPost("otp/verify")]
    [EnableRateLimiting("otp")]
    public async Task<ActionResult<AuthResponse>> VerifyOtp(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        if (request.Code != "123456")
        {
            return Unauthorized(new { error = "Invalid OTP code." });
        }

        var phone = NormalizePhone(request.PhoneNumber);
        var email = NormalizeEmail(request.Email);
        if (request.Channel == OtpChannel.Email && !IsValidEmail(email))
        {
            return BadRequest(new { error = "A valid email address is required." });
        }

        if (string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(new { error = "Phone number is required." });
        }

        if (request.Role == UserRole.Admin && !IsAdminOtpAllowed(phone, email))
        {
            return Forbid();
        }

        var displayName = string.IsNullOrWhiteSpace(request.DisplayName) ? null : request.DisplayName.Trim();
        var user = await db.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phone, cancellationToken);
        if (user is null && !string.IsNullOrWhiteSpace(email))
        {
            user = await db.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
        }

        if (user is null)
        {
            user = new AppUser
            {
                PhoneNumber = phone,
                DisplayName = displayName,
                Email = email,
                Role = request.Role,
                IsPhoneVerified = request.Channel == OtpChannel.Phone,
                IsEmailVerified = request.Channel == OtpChannel.Email
            };

            db.Users.Add(user);
        }
        else
        {
            if (request.Channel == OtpChannel.Phone)
            {
                user.IsPhoneVerified = true;
            }

            if (request.Channel == OtpChannel.Email)
            {
                user.IsEmailVerified = true;
            }

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

    private bool IsAdminOtpAllowed(string phoneNumber, string? email)
    {
        var configuredAdmins = configuration.GetSection("Auth:AdminPhoneNumbers").Get<string[]>() ?? [];
        if (configuredAdmins.Any(x => string.Equals(x.Trim(), phoneNumber, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        var configuredAdminEmails = configuration.GetSection("Auth:AdminEmails").Get<string[]>() ?? [];
        if (!string.IsNullOrWhiteSpace(email) && configuredAdminEmails.Any(x => string.Equals(x.Trim(), email, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return environment.IsDevelopment() && configuration.GetValue("Auth:AllowDevelopmentAdminOtp", true);
    }

    private static string NormalizePhone(string? phoneNumber)
    {
        return phoneNumber?.Trim() ?? string.Empty;
    }

    private static string? NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
    }

    private static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
