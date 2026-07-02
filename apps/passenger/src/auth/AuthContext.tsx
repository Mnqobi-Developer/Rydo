import * as SecureStore from 'expo-secure-store';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { AuthSession, type OtpChannel, requestPassengerOtp, verifyPassengerOtp } from './authApi';

const storageKey = 'rydo.passenger.auth';

type AuthState = {
  loading: boolean;
  session?: AuthSession;
  requestOtp: (phoneNumber: string, email?: string, channel?: OtpChannel) => Promise<void>;
  verifyOtp: (phoneNumber: string, code: string, profile?: { displayName?: string; email?: string }, channel?: OtpChannel) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession>();

  useEffect(() => {
    let mounted = true;

    readSession()
      .then((stored) => {
        if (mounted) {
          setSession(stored);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      requestOtp: async (phoneNumber, email, channel = 'phone') => {
        await requestPassengerOtp(phoneNumber, email, channel);
      },
      verifyOtp: async (phoneNumber, code, profile, channel = 'phone') => {
        const nextSession = await verifyPassengerOtp(phoneNumber, code, profile, channel);
        await writeSession(nextSession);
        setSession(nextSession);
      },
      signOut: async () => {
        await clearSession();
        setSession(undefined);
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

async function readSession() {
  const stored = await readStorage();
  return stored ? JSON.parse(stored) as AuthSession : undefined;
}

async function writeSession(session: AuthSession) {
  await writeStorage(JSON.stringify(session));
}

async function readStorage() {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(storageKey);
  }

  return SecureStore.getItemAsync(storageKey);
}

async function writeStorage(value: string) {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(storageKey, value);
    return;
  }

  await SecureStore.setItemAsync(storageKey, value);
}

async function clearSession() {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(storageKey);
    return;
  }

  await SecureStore.deleteItemAsync(storageKey);
}
