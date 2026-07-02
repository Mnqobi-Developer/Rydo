import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AdminSession, verifyAdminOtp } from '../api/adminApi';

type AdminAuthContextValue = {
  loading: boolean;
  session?: AdminSession;
  signIn: (phoneNumber: string, code: string, displayName?: string) => Promise<void>;
  signOut: () => void;
};

const STORAGE_KEY = 'rydo.admin.session';
const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AdminSession>();

  useEffect(() => {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      setSession(JSON.parse(stored) as AdminSession);
    }
    setLoading(false);
  }, []);

  const value = useMemo<AdminAuthContextValue>(() => ({
    loading,
    session,
    signIn: async (phoneNumber, code, displayName) => {
      const nextSession = await verifyAdminOtp(phoneNumber, code, displayName);
      setSession(nextSession);
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    },
    signOut: () => {
      setSession(undefined);
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    },
  }), [loading, session]);

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider.');
  }
  return context;
}
