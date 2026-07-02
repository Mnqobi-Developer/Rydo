import { Platform } from 'react-native';

const defaultApiUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5090' : 'http://localhost:5090';
const apiUrl = process.env.EXPO_PUBLIC_RYDO_API_URL ?? defaultApiUrl;

export type DriverAuthSession = {
  userId: string;
  role: number;
  accessToken: string;
  phoneNumber: string;
  driverProfileId?: string | null;
  displayName?: string | null;
  email?: string | null;
};

type AuthResponse = {
  userId: string;
  role: number;
  accessToken: string;
  driverProfileId?: string | null;
  displayName?: string | null;
  email?: string | null;
};

export async function requestDriverOtp(phoneNumber: string) {
  return request<{ phoneNumber: string; expiresInSeconds: number; developmentCode?: string }>('/api/auth/otp/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, role: 2 }),
  });
}

export async function verifyDriverOtp(phoneNumber: string, code: string, profile?: { displayName?: string; email?: string }): Promise<DriverAuthSession> {
  const response = await request<AuthResponse>('/api/auth/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, code, role: 2, displayName: profile?.displayName, email: profile?.email }),
  });

  return { ...response, phoneNumber };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, init);
  if (!response.ok) {
    const problem = await response.text();
    throw new Error(getErrorMessage(problem, response.status));
  }

  return response.json() as Promise<T>;
}

function getErrorMessage(problem: string, status: number) {
  if (!problem) {
    return `Request failed with HTTP ${status}`;
  }

  try {
    const parsed = JSON.parse(problem) as { error?: string; title?: string; detail?: string };
    return parsed.error ?? parsed.detail ?? parsed.title ?? problem;
  } catch {
    return problem;
  }
}
