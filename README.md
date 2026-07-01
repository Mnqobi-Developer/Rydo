# Rydo

RYDO is a local ride-hailing MVP with separate passenger and driver experiences.

## Apps

- Passenger mobile app: Expo Router + React Native + TypeScript in `apps/passenger`
- Driver mobile app: Expo Router + React Native + TypeScript in `apps/driver`
- Shared mobile design system: `packages/design-system`
- Backend: ASP.NET Core Web API + SignalR
- Database: PostgreSQL + PostGIS
- Maps: Google Maps Platform planned for production routing, places, geocoding, and distance calculations

## Current State

- Passenger and driver are separate Expo applications with file-based navigation.
- Both apps share Rydo branding and reusable controls through the design-system workspace package.
- The backend scaffold is in `backend/Rydo.Api` with controllers, SignalR hubs, EF Core entities, and PostGIS-ready data access.
- Local PostGIS setup is in `backend/docker-compose.yml`.
- Google Maps integration includes native map rendering, current-location permission, Places autocomplete, route display, and backend fare estimates.

## Run Passenger App

```powershell
npm install
npm run passenger
```

For the web preview:

```powershell
npm run passenger:web
```

## Run Driver App

```powershell
npm run driver
```

For the web preview:

```powershell
npm run driver:web
```

## Validate Mobile Apps

```powershell
npm run typecheck
```

## Run Backend

Install the .NET 8 SDK first.

```powershell
cd backend
docker compose up -d
cd Rydo.Api
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet run
```
