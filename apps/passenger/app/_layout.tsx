import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/auth/AuthContext';
import { BookingProvider } from '../src/maps/BookingContext';
import { SavedPlacesProvider } from '../src/places/SavedPlacesContext';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <AuthProvider>
        <SavedPlacesProvider>
          <BookingProvider>
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
          </BookingProvider>
        </SavedPlacesProvider>
      </AuthProvider>
    </>
  );
}
