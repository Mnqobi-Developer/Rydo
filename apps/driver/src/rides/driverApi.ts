import { Platform } from 'react-native';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';
export const apiUrl = process.env.EXPO_PUBLIC_RYDO_API_URL ?? defaultApiUrl;

export type RideRequest = {
  id?: string;
  tripId?: string;
  passengerId?: string;
  preferredPaymentMethod?: number;
  pickupAddress: string;
  destinationAddress: string;
  estimatedFare: number;
  rideType: number;
};

export type TripResponse = {
  tripId: string;
  status: number;
  rideType: number;
  pickupAddress: string;
  destinationAddress: string;
  estimatedFare: number;
  passengerId?: string;
  preferredPaymentMethod?: number;
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
  status: number;
  rideType: number;
  pickupAddress: string;
  destinationAddress: string;
  fare: number;
  preferredPaymentMethod: number;
  requestedAtUtc: string;
  completedAtUtc?: string | null;
};

export type DriverStatus = {
  driverProfileId: string;
  isOnline: boolean;
  isVerified: boolean;
};

export type DriverSummaryStats = {
  driverProfileId: string;
  isOnline: boolean;
  todayEarnings: number;
  todayTrips: number;
  weekEarnings: number;
  weekTrips: number;
  ratingAverage: number;
  ratingCount: number;
};

export type DriverLocationPayload = {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speedMetersPerSecond?: number | null;
};

export async function getDriverStatus(driverProfileId: string, accessToken: string) {
  return request<DriverStatus>(`/api/drivers/${driverProfileId}/status`, accessToken);
}

export async function getDriverSummary(driverProfileId: string, accessToken: string) {
  return request<DriverSummaryStats>(`/api/drivers/${driverProfileId}/summary`, accessToken);
}

export async function getDriverTrips(driverProfileId: string, accessToken: string) {
  return request<TripListItem[]>(`/api/drivers/${driverProfileId}/trips`, accessToken);
}

export async function setAvailability(driverProfileId: string, isOnline: boolean, accessToken: string) {
  await request(`/api/drivers/${driverProfileId}/availability`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isOnline }),
  });
}

export async function updateDriverLocation(driverProfileId: string, accessToken: string, location: DriverLocationPayload) {
  await request(`/api/drivers/${driverProfileId}/location`, accessToken, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(location),
  });
}

export function getRideTripId(request: RideRequest) {
  return request.tripId ?? request.id ?? '';
}

export async function acceptTrip(tripId: string, driverProfileId: string, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/accept`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverProfileId }),
  });
}

export async function declineTrip(tripId: string, driverProfileId: string, accessToken: string) {
  await request(`/api/trips/${tripId}/decline`, accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ driverProfileId }),
  });
}

export async function updateTripStatus(tripId: string, status: number, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/status`, accessToken, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function markDriverArrived(tripId: string, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/arrive`, accessToken, { method: 'POST' });
}

export async function startTrip(tripId: string, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/start`, accessToken, { method: 'POST' });
}

export async function completeTrip(tripId: string, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/complete`, accessToken, { method: 'POST' });
}

export async function cancelTrip(tripId: string, accessToken: string) {
  return request<TripResponse>(`/api/trips/${tripId}/cancel`, accessToken, { method: 'POST' });
}

async function request<T = void>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
