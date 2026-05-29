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

Run the API:

```powershell
cd C:\Users\dntsi\Documents\Rydo\backend\Rydo.Api
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet run
```

Swagger will be available in development at the API URL shown by `dotnet run`.

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
- Google Maps Places, Directions, Distance Matrix, and Geocoding services
- Payment providers after MVP traction: Ozow, SnapScan, Yoco, Apple Pay, Google Pay
- Background worker for ride request expiry and matching radius expansion
- Admin dashboard authorization and audit logs
