import { Platform } from 'react-native';
import type { AuthSession } from '../auth/authApi';
import type { RouteEstimate, SelectedPlace } from '../maps/types';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';
export const apiUrl = process.env.EXPO_PUBLIC_RYDO_API_URL ?? defaultApiUrl;

export type TripStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type PaymentMethod = 1 | 2 | 3 | 4;

export type TripResponse = {
  tripId: string;
  status: TripStatus;
  rideType: number;
  pickupAddress: string;
  destinationAddress: string;
  estimatedFare: number;
  preferredPaymentMethod: PaymentMethod;
  driverProfileId?: string | null;
  driver?: {
    driverProfileId: string;
    userId: string;
    name: string;
    ratingAverage: number;
    isVerified: boolean;
    photoUrl?: string | null;
    vehicleModel?: string | null;
    vehicleColour?: string | null;
    numberPlate?: string | null;
  } | null;
};

export type TripListItem = {
  tripId: string;
  status: TripStatus;
  rideType: number;
  pickupAddress: string;
  destinationAddress: string;
  fare: number;
  preferredPaymentMethod: PaymentMethod;
  requestedAtUtc: string;
  completedAtUtc?: string | null;
};

export async function createTrip({
  session,
  pickup,
  destination,
  route,
  rideType,
  paymentMethod,
}: {
  session: AuthSession;
  pickup: SelectedPlace;
  destination: SelectedPlace;
  route?: RouteEstimate;
  rideType: number;
  paymentMethod: PaymentMethod;
}) {
  return request<TripResponse>('/api/trips', session.accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      passengerId: session.userId,
      rideType,
      pickupAddress: pickup.address,
      pickupLatitude: pickup.latitude,
      pickupLongitude: pickup.longitude,
      destinationAddress: destination.address,
      destinationLatitude: destination.latitude,
      destinationLongitude: destination.longitude,
      estimatedDistanceMeters: route?.distanceMeters,
      estimatedDurationSeconds: route?.durationSeconds,
      preferredPaymentMethod: paymentMethod,
    }),
  });
}

export async function updateTripStatus(tripId: string, status: TripStatus, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/status`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function getPassengerTrips(passengerId: string, accessToken: string) {
  return request<TripListItem[]>(`/api/trips/passenger/${passengerId}`, accessToken);
}

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const problem = await response.text();
    throw new Error(problem || `Request failed with HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}
