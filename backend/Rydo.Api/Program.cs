using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NetTopologySuite;
using Rydo.Api.Data;
using Rydo.Api.Hubs;
using Rydo.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<GzipCompressionProvider>();
});
builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = System.IO.Compression.CompressionLevel.Fastest;
});
builder.Services.AddHealthChecks().AddCheck<DatabaseHealthCheck>("database");
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("otp", limiter =>
    {
        limiter.PermitLimit = 5;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("maps", limiter =>
    {
        limiter.PermitLimit = 90;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 10;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    options.AddFixedWindowLimiter("trips", limiter =>
    {
        limiter.PermitLimit = 60;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 10;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
    options.AddFixedWindowLimiter("driver-location", limiter =>
    {
        limiter.PermitLimit = 120;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
    });
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var key = context.User.Identity?.IsAuthenticated == true
            ? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "authenticated"
            : context.Connection.RemoteIpAddress?.ToString() ?? "anonymous";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 600,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 25,
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst
        });
    });
});
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Paste the JWT access token returned by /api/auth/otp/verify.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            []
        }
    });
});
var signalRBuilder = builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(45);
});

var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConnectionString))
{
    signalRBuilder.AddStackExchangeRedis(redisConnectionString);
}

builder.Services.AddDbContextPool<RydoDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("RydoDb");
    options.UseNpgsql(connectionString, npgsql =>
    {
        npgsql.UseNetTopologySuite();
        npgsql.MigrationsAssembly(typeof(RydoDbContext).Assembly.FullName);
    });
});

builder.Services.AddSingleton(NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326));
builder.Services.AddScoped<JwtTokenService>();
builder.Services.AddScoped<PricingService>();
builder.Services.AddScoped<DriverMatchingService>();
builder.Services.AddScoped<RideNotificationService>();
builder.Services.AddHttpClient<GoogleMapsService>();
builder.Services.AddHostedService<TripMaintenanceService>();

var jwt = builder.Configuration.GetSection("Jwt");
var signingKey = jwt["SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey is required.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ClockSkew = TimeSpan.FromMinutes(2)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrWhiteSpace(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("RydoClients", policy =>
    {
        policy
            .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        context.Response.ContentType = "application/problem+json";

        if (exception is GoogleMapsConfigurationException)
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new
            {
                title = "Google Maps is not configured",
                detail = "Set GoogleMaps:ApiKey using user secrets or an environment variable."
            });
            return;
        }

        context.Response.StatusCode = StatusCodes.Status502BadGateway;
        await context.Response.WriteAsJsonAsync(new
        {
            title = "Request failed",
            detail = app.Environment.IsDevelopment() ? exception?.Message : null
        });
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
    context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
    context.Response.Headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    await next();
});

app.UseResponseCompression();
app.UseHttpsRedirection();
app.UseCors("RydoClients");
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();
app.MapHub<RideHub>("/hubs/rides");
app.MapHub<AdminHub>("/hubs/admin");

app.MapHealthChecks("/health");
app.MapGet("/health/live", () => Results.Ok(new { status = "ok", service = "Rydo.Api" }));

app.Run();
