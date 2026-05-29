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
        var user = await db.Users.FirstOrDefaultAsync(x => x.PhoneNumber == phone, cancellationToken);

        if (user is null)
        {
            user = new AppUser
            {
                PhoneNumber = phone,
                Role = request.Role,
                IsPhoneVerified = true
            };

            db.Users.Add(user);
        }
        else
        {
            user.IsPhoneVerified = true;
            user.Role = request.Role;
        }

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new AuthResponse(user.Id, user.Role, tokens.CreateToken(user)));
    }
}
