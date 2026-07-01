import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import type { SelectedPlace } from './types';

export function useCurrentLocation() {
  const [location, setLocation] = useState<SelectedPlace>();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setPermissionDenied(true);
      setLoading(false);
      return;
    }

    setPermissionDenied(false);
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setLocation({
      name: 'Current location',
      address: 'Your current location',
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { location, permissionDenied, loading, refresh };
}
