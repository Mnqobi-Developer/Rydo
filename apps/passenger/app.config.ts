import type { ExpoConfig } from 'expo/config';

const googleMapsApiKey = process.env.GOOGLE_MAPS_MOBILE_API_KEY ?? '';

const config: ExpoConfig = {
  name: 'Rydo Passenger',
  slug: 'rydo-passenger',
  scheme: 'rydo-passenger',
  version: '1.0.0',
  orientation: 'portrait',
  icon: '../../assets/icon.png',
  userInterfaceStyle: 'light',
  plugins: [
    'expo-secure-store',
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: googleMapsApiKey,
        iosGoogleMapsApiKey: googleMapsApiKey,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Allow Rydo to use your location for pickups and live trips.',
      },
    ],
  ],
  web: {
    bundler: 'metro',
    favicon: '../../assets/favicon.png',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'za.co.rydo.passenger',
  },
  android: {
    package: 'za.co.rydo.passenger',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    adaptiveIcon: {
      backgroundColor: '#0757D8',
      foregroundImage: '../../assets/android-icon-foreground.png',
    },
  },
};

export default config;
