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

## Run On Expo Go And Simulators

Install Expo Go on your physical iPhone or Android device. Your phone and PC must be on the same Wi-Fi network.

Start the backend on your LAN so a physical phone can reach it:

```powershell
npm run api:lan
```

In a second terminal, start the passenger app for Expo Go:

```powershell
npm run passenger:go
```

In another terminal, start the driver app for Expo Go:

```powershell
npm run driver:go
```

Scan the QR code with Expo Go. The launcher sets `EXPO_PUBLIC_RYDO_API_URL` to your PC LAN IP, for example `http://192.168.x.x:5090`.

For Android Emulator, install Android Studio and create a virtual device from Device Manager. Use a recent Google APIs image, for example Pixel + API 34. Start that emulator, then run:

```powershell
npm run passenger:android
npm run driver:android
```

The Android Emulator uses `http://10.0.2.2:5090` to reach the local backend.

If you want to create emulators from the command line, install Android SDK Command-line Tools from Android Studio's SDK Manager. The old SDK Tools `avdmanager` is not enough on current Java runtimes.

iOS Simulator requires macOS with Xcode. It cannot be created or run on Windows. On Windows, use Expo Go on a physical iPhone. On a Mac, run:

```powershell
npm run passenger:ios
npm run driver:ios
```

If Expo Go cannot connect, allow `dotnet`, `node`, and port `5090` through Windows Firewall.
