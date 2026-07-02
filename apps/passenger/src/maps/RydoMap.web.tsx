import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { colors } from '@rydo/design-system';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Coordinate, SelectedPlace } from './types';

export type RydoMapHandle = {
  fitRoute: () => void;
};

type Props = {
  currentLocation?: Coordinate;
  pickup?: SelectedPlace;
  destination?: SelectedPlace;
  routeCoordinates?: Coordinate[];
};

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ?? '';
const fallbackCenter = { lat: -26.1076, lng: 28.0567 };

export const RydoMap = forwardRef<RydoMapHandle, Props>(function RydoMap(
  { currentLocation, pickup, destination, routeCoordinates = [] },
  ref,
) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'rydo-google-map',
    googleMapsApiKey: apiKey,
  });

  const fitRoute = () => {
    if (!mapRef.current || !window.google) return;
    const points = routeCoordinates.length > 1
      ? routeCoordinates
      : [pickup, destination].filter((place): place is SelectedPlace => Boolean(place));
    if (points.length < 2) return;

    const bounds = new window.google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend({ lat: point.latitude, lng: point.longitude }));
    mapRef.current.fitBounds(bounds, 72);
  };

  useImperativeHandle(ref, () => ({ fitRoute }));

  useEffect(() => {
    if (isLoaded) fitRoute();
  }, [isLoaded, routeCoordinates.length, pickup?.latitude, destination?.latitude]);

  if (!apiKey) {
    return (
      <View style={styles.unconfigured}>
        <View style={styles.configCard}>
          <Text style={styles.title}>Google Maps key required</Text>
          <Text style={styles.body}>Set EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY in apps/passenger/.env, then restart Expo.</Text>
        </View>
      </View>
    );
  }

  if (loadError) {
    return <MapMessage title="Google Maps failed to load" body="Check that Maps JavaScript API is enabled and the key allows http://localhost:8082/*." />;
  }

  if (!isLoaded) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.blue} /><Text style={styles.body}>Loading Google Maps...</Text></View>;
  }

  const center = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : fallbackCenter;

  return (
    <GoogleMap
      mapContainerStyle={styles.mapContainer}
      center={center}
      zoom={13}
      onLoad={(map) => { mapRef.current = map; fitRoute(); }}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: 'greedy',
      }}
    >
      {pickup && <MarkerF position={{ lat: pickup.latitude, lng: pickup.longitude }} title={`Pickup: ${pickup.name}`} />}
      {destination && <MarkerF position={{ lat: destination.latitude, lng: destination.longitude }} title={`Destination: ${destination.name}`} />}
      {routeCoordinates.length > 1 && (
        <PolylineF
          path={routeCoordinates.map((point) => ({ lat: point.latitude, lng: point.longitude }))}
          options={{ strokeColor: colors.blue, strokeOpacity: 1, strokeWeight: 6 }}
        />
      )}
    </GoogleMap>
  );
});

function MapMessage({ title, body }: { title: string; body: string }) {
  return <View style={styles.unconfigured}><View style={styles.configCard}><Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View></View>;
}

const styles = StyleSheet.create({
  mapContainer: { width: '100%', height: '100%' },
  loading: { flex: 1, backgroundColor: '#edf2f8', alignItems: 'center', justifyContent: 'center', gap: 10 },
  unconfigured: { flex: 1, backgroundColor: '#e8eef7', alignItems: 'center', justifyContent: 'center', padding: 20 },
  configCard: { maxWidth: 420, borderRadius: 12, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: colors.line },
  title: { color: colors.navy, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 6, textAlign: 'center' },
});
