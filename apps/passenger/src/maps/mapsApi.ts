import { Platform } from 'react-native';
import type { Coordinate, PlaceSuggestion, RouteEstimate, SelectedPlace } from './types';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';
const apiUrl = process.env.EXPO_PUBLIC_RYDO_API_URL ?? defaultApiUrl;

export async function autocompletePlaces(input: string, near?: Coordinate): Promise<PlaceSuggestion[]> {
  const query = new URLSearchParams({ input });
  if (near) {
    query.set('latitude', near.latitude.toString());
    query.set('longitude', near.longitude.toString());
  }

  return request<PlaceSuggestion[]>(`/api/maps/autocomplete?${query}`);
}

export async function getPlace(placeId: string): Promise<SelectedPlace> {
  return request<SelectedPlace>(`/api/maps/places/${encodeURIComponent(placeId)}`);
}

export async function computeRoute(origin: Coordinate, destination: Coordinate): Promise<RouteEstimate> {
  return request<RouteEstimate>('/api/maps/routes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originLatitude: origin.latitude,
      originLongitude: origin.longitude,
      destinationLatitude: destination.latitude,
      destinationLongitude: destination.longitude,
      rideType: 1,
    }),
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, init);
  if (!response.ok) {
    const problem = await response.text();
    throw new Error(problem || `Request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
