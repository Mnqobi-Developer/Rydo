import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DriverAuthProvider } from '../src/auth/AuthContext';
import { DriverRideProvider } from '../src/rides/DriverRideContext';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <DriverAuthProvider>
        <DriverRideProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
        </DriverRideProvider>
      </DriverAuthProvider>
    </>
  );
}
