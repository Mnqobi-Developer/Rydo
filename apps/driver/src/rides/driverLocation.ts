import * as Location from 'expo-location';
import type { DriverLocationPayload } from './driverApi';

export async function getCurrentDriverLocation(): Promise<DriverLocationPayload> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) {
    throw new Error('Location permission is required before you can receive nearby ride requests.');
  }

  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
    heading: result.coords.heading,
    speedMetersPerSecond: result.coords.speed,
  };
}
