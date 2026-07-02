import { Stack } from 'expo-router';
import { AdminAuthProvider } from '../src/auth/AdminAuthContext';

export default function Layout() {
  return (
    <AdminAuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AdminAuthProvider>
  );
}
