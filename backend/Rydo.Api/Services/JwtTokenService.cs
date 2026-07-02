using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Rydo.Api.Domain;

namespace Rydo.Api.Services;

public sealed class JwtTokenService(IConfiguration configuration)
{
    public string CreateToken(AppUser user)
    {
        var jwt = configuration.GetSection("Jwt");
        var signingKey = jwt["SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey is required.");

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.MobilePhone, user.PhoneNumber),
            new Claim(ClaimTypes.Role, user.Role.ToString())
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            SecurityAlgorithms.HmacSha256);

        var lifetimeMinutes = jwt.GetValue("AccessTokenMinutes", 240);
        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"],
            audience: jwt["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(lifetimeMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
