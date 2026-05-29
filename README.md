# Rydo

RYDO is a local ride-hailing MVP with separate passenger and driver experiences.

## Apps

- Mobile frontend: Expo + React Native + TypeScript
- Backend: ASP.NET Core Web API + SignalR
- Database: PostgreSQL + PostGIS
- Maps: Google Maps Platform planned for production routing, places, geocoding, and distance calculations

## Current State

- The Expo app currently contains clickable passenger and driver UI prototype screens.
- The backend scaffold is in `backend/Rydo.Api` with controllers, SignalR hubs, EF Core entities, and PostGIS-ready data access.
- Local PostGIS setup is in `backend/docker-compose.yml`.

## Run Frontend

```powershell
npm install
npm run web
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
