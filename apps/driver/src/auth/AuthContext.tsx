import * as SecureStore from 'expo-secure-store';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { DriverAuthSession, requestDriverOtp, verifyDriverOtp } from './authApi';

const storageKey = 'rydo.driver.auth';

type AuthState = {
  loading: boolean;
  session?: DriverAuthSession;
  requestOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, code: string, profile?: { displayName?: string; email?: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function DriverAuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<DriverAuthSession>();

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
      requestOtp: async (phoneNumber) => {
        await requestDriverOtp(phoneNumber);
      },
      verifyOtp: async (phoneNumber, code, profile) => {
        const nextSession = await verifyDriverOtp(phoneNumber, code, profile);
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

export function useDriverAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useDriverAuth must be used inside DriverAuthProvider.');
  }

  return context;
}

async function readSession() {
  const stored = await readStorage();
  return stored ? JSON.parse(stored) as DriverAuthSession : undefined;
}

async function writeSession(session: DriverAuthSession) {
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
