export const apiUrl = process.env.EXPO_PUBLIC_RYDO_API_URL ?? 'http://localhost:5090';

export type AdminSession = {
  userId: string;
  accessToken: string;
  displayName?: string;
  email?: string;
};

export type AdminOverview = {
  totalUsers: number;
  totalDrivers: number;
  onlineDrivers: number;
  activeTrips: number;
  completedToday: number;
  pendingDisputes: number;
  paidToday: number;
  recentTrips: AdminTripSummary[];
};

export type AdminTripSummary = {
  id: string;
  status: number;
  rideType: number;
  pickupAddress: string;
  destinationAddress: string;
  fare: number;
  preferredPaymentMethod: number;
  requestedAtUtc: string;
};

export type AdminUser = {
  id: string;
  displayName?: string;
  phoneNumber: string;
  email?: string;
  role: number;
  isPhoneVerified: boolean;
  createdAtUtc: string;
};

export type AdminDriver = {
  id: string;
  userId: string;
  name?: string;
  phoneNumber: string;
  isOnline: boolean;
  isVerified: boolean;
  ratingAverage: number;
  ratingCount: number;
  vehicle?: {
    make: string;
    model: string;
    colour: string;
    numberPlate: string;
    isActive: boolean;
  };
};

export type AdminDriverDetail = AdminDriver & {
  email?: string;
  createdAtUtc: string;
  vehicles: Array<{
    id: string;
    make: string;
    model: string;
    colour: string;
    numberPlate: string;
    supportedRideType: number;
    isActive: boolean;
  }>;
  trips: Array<{
    id: string;
    status: number;
    rideType: number;
    pickupAddress: string;
    destinationAddress: string;
    fare: number;
    requestedAtUtc: string;
    completedAtUtc?: string;
    cancelledAtUtc?: string;
  }>;
};

export type AdminTrip = {
  id: string;
  passengerId: string;
  driverProfileId?: string;
  status: number;
  rideType: number;
  pickupAddress: string;
  destinationAddress: string;
  fare: number;
  preferredPaymentMethod: number;
  requestedAtUtc: string;
  completedAtUtc?: string;
  cancelledAtUtc?: string;
};

export type AdminTripDetail = AdminTrip & {
  estimatedFare: number;
  finalFare?: number;
  estimatedDistanceMeters?: number;
  estimatedDurationSeconds?: number;
  acceptedAtUtc?: string;
  startedAtUtc?: string;
  passenger?: {
    id: string;
    displayName?: string;
    phoneNumber: string;
    email?: string;
  };
  driver?: {
    id: string;
    userId: string;
    name?: string;
    phoneNumber: string;
    isOnline: boolean;
    isVerified: boolean;
    ratingAverage: number;
    ratingCount: number;
    vehicle?: {
      make: string;
      model: string;
      colour: string;
      numberPlate: string;
      supportedRideType: number;
      isActive: boolean;
    };
  };
  payment?: Omit<AdminPayment, 'tripId'>;
  disputes: Array<{
    id: string;
    status: number;
    reason: string;
    resolutionNotes?: string;
    createdAtUtc: string;
    resolvedAtUtc?: string;
  }>;
  timeline: Array<{
    label: string;
    atUtc: string;
  }>;
};

export type AdminPayment = {
  id: string;
  tripId: string;
  method: number;
  status: number;
  amount: number;
  currency: string;
  providerReference?: string;
  createdAtUtc: string;
  paidAtUtc?: string;
};

export type AdminDispute = {
  id: string;
  tripId: string;
  createdByUserId: string;
  status: number;
  reason: string;
  resolutionNotes?: string;
  createdAtUtc: string;
  resolvedAtUtc?: string;
};

export type AdminLiveMap = {
  drivers: Array<{
    id: string;
    isOnline: boolean;
    isVerified: boolean;
    ratingAverage: number;
    latitude: number;
    longitude: number;
    heading?: number;
    recordedAtUtc: string;
  }>;
  activeTrips: Array<{
    id: string;
    status: number;
    driverProfileId?: string;
    pickupLatitude: number;
    pickupLongitude: number;
    destinationLatitude: number;
    destinationLongitude: number;
  }>;
};

export async function requestAdminOtp(phoneNumber: string) {
  await request('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, role: 3 }),
  });
}

export async function verifyAdminOtp(phoneNumber: string, code: string, displayName?: string): Promise<AdminSession> {
  const response = await request<{ userId: string; accessToken: string; displayName?: string; email?: string }>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code, role: 3, displayName }),
  });

  return {
    userId: response.userId,
    accessToken: response.accessToken,
    displayName: response.displayName,
    email: response.email,
  };
}

export function getAdminOverview(accessToken: string) {
  return authorizedRequest<AdminOverview>('/api/admin/overview', accessToken);
}

export function getAdminUsers(accessToken: string) {
  return authorizedRequest<AdminUser[]>('/api/admin/users', accessToken);
}

export function getAdminDrivers(accessToken: string) {
  return authorizedRequest<AdminDriver[]>('/api/admin/drivers', accessToken);
}

export function getAdminDriver(driverProfileId: string, accessToken: string) {
  return authorizedRequest<AdminDriverDetail>(`/api/admin/drivers/${driverProfileId}`, accessToken);
}

export function updateAdminDriverVerification(driverProfileId: string, isVerified: boolean, accessToken: string) {
  return authorizedRequest<void>(`/api/admin/drivers/${driverProfileId}/verification`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ isVerified }),
  });
}

export function setAdminDriverOffline(driverProfileId: string, accessToken: string) {
  return authorizedRequest<void>(`/api/admin/drivers/${driverProfileId}/offline`, accessToken, {
    method: 'POST',
  });
}

export function getAdminTrips(accessToken: string) {
  return authorizedRequest<AdminTrip[]>('/api/admin/trips', accessToken);
}

export function getAdminTrip(tripId: string, accessToken: string) {
  return authorizedRequest<AdminTripDetail>(`/api/admin/trips/${tripId}`, accessToken);
}

export function cancelAdminTrip(tripId: string, accessToken: string) {
  return authorizedRequest<void>(`/api/admin/trips/${tripId}/cancel`, accessToken, {
    method: 'POST',
  });
}

export function getAdminPayments(accessToken: string) {
  return authorizedRequest<AdminPayment[]>('/api/admin/payments', accessToken);
}

export function updateAdminPaymentStatus(paymentId: string, status: number, accessToken: string) {
  return authorizedRequest<void>(`/api/admin/payments/${paymentId}/status`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getAdminDisputes(accessToken: string) {
  return authorizedRequest<AdminDispute[]>('/api/admin/disputes', accessToken);
}

export function updateAdminDispute(disputeId: string, status: number, resolutionNotes: string | undefined, accessToken: string) {
  return authorizedRequest<void>(`/api/admin/disputes/${disputeId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status, resolutionNotes }),
  });
}

export function getAdminLiveMap(accessToken: string) {
  return authorizedRequest<AdminLiveMap>('/api/admin/live-map', accessToken);
}

async function authorizedRequest<T>(path: string, accessToken: string, init: RequestInit = {}) {
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
}

async function request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
