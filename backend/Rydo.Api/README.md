# Rydo API

ASP.NET Core Web API backend for the RYDO passenger and driver apps.

## Stack

- ASP.NET Core Web API
- SignalR for live ride updates
- PostgreSQL with PostGIS for location-heavy data
- EF Core with NetTopologySuite
- JWT bearer authentication

## Local Setup

Install the .NET 8 SDK, then start PostGIS:

```powershell
cd C:\Users\dntsi\Documents\Rydo\backend
docker compose up -d
```

The project PostGIS container is exposed on host port `5433` because a local PostgreSQL installation may already use `5432`.

Or complete Docker startup and migration application with:

```powershell
cd C:\Users\dntsi\Documents\Rydo
.\backend\setup-local.ps1
```

Run the API:

```powershell
cd C:\Users\dntsi\Documents\Rydo\backend\Rydo.Api
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet run
```

Swagger will be available in development at the API URL shown by `dotnet run`.

## Supabase Database Setup

Supabase can replace the local Docker PostGIS database because this API already uses PostgreSQL, EF Core, Npgsql, and PostGIS-compatible geography columns.

In Supabase:

1. Create a Supabase project.
2. Open **Project Settings > Database > Connection string**.
3. Copy the **URI** or **.NET/Npgsql** connection string for the primary database.
4. Use a connection string with SSL enabled. A typical Npgsql shape is:

```text
Host=aws-0-region.pooler.supabase.com;Port=6543;Database=postgres;Username=postgres.project-ref;Password=your-password;SSL Mode=Require;Trust Server Certificate=true
```

For local setup, store the Supabase connection string in ASP.NET user secrets and apply EF Core migrations:

```powershell
cd C:\Users\dntsi\Documents\Rydo
.\backend\setup-supabase.ps1 -ConnectionString "Host=...;Port=6543;Database=postgres;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true"
```

This stores:

```text
ConnectionStrings:RydoDb
```

The existing `InitialCreate` migration enables the `postgis` extension and creates the Rydo MVP tables. If Supabase blocks extension creation for your database role, enable **Database > Extensions > postgis** in the Supabase dashboard, then rerun:

```powershell
cd C:\Users\dntsi\Documents\Rydo\backend\Rydo.Api
dotnet tool run dotnet-ef database update
```

Keep `appsettings.json` pointed at local Docker. Use user secrets for Supabase so production credentials are never committed.

## MVP Endpoints

- `POST /api/auth/otp/request`
- `POST /api/auth/otp/verify`
- `POST /api/trips`
- `GET /api/trips/{tripId}`
- `POST /api/trips/{tripId}/accept`
- `PATCH /api/trips/{tripId}/status`
- `POST /api/drivers/{driverProfileId}/availability`
- `PUT /api/drivers/{driverProfileId}/location`
- `POST /api/payments`
- `POST /api/ratings`
- `GET /api/admin/live-map`

## SignalR Hubs

- `/hubs/rides`
  - client joins a trip with `JoinTrip(tripId)`
  - driver joins ride requests with `JoinDriverQueue(driverProfileId)`
  - events: `trip.updated`, `ride.requested`, `driver.location`
- `/hubs/admin`
  - admin joins live map with `JoinLiveMap()`
  - events: `trip.updated`, `driver.location`

## Production Integrations To Add

- SMS OTP provider for South African phone authentication
- Payment providers after MVP traction: Ozow, SnapScan, Yoco, Apple Pay, Google Pay
- Background worker for ride request expiry and matching radius expansion
- Admin dashboard authorization and audit logs

## Google Maps Setup

Enable billing and these APIs in the Google Cloud project:

- Maps SDK for Android
- Maps SDK for iOS
- Maps JavaScript API
- Places API (New)
- Routes API

Use separate keys:

1. Create mobile Maps SDK keys restricted to `za.co.rydo.passenger` and the relevant Android SHA-1/iOS bundle identifier.
2. Create a browser key restricted to `http://localhost:8082/*` and Maps JavaScript API.
3. Copy `apps/passenger/.env.example` to `apps/passenger/.env` and set both mobile and web keys.
4. Create a server key restricted to Places API (New) and Routes API.
5. Store the server key using ASP.NET user secrets:

```powershell
cd C:\Users\dntsi\Documents\Rydo\backend\Rydo.Api
dotnet user-secrets set "GoogleMaps:ApiKey" "your-server-key"
```

Map endpoints:

- `GET /api/maps/autocomplete?input=Sandton`
- `GET /api/maps/places/{placeId}`
- `POST /api/maps/routes`

The mobile app calls these backend endpoints so the server key is not exposed in the app.
