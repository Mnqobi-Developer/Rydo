import { colors } from '@rydo/design-system';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type MapViewProps } from 'react-native-maps';
import type { Coordinate, SelectedPlace } from './types';

export type RydoMapHandle = {
  fitRoute: () => void;
};

type Props = {
  currentLocation?: Coordinate;
  pickup?: SelectedPlace;
  destination?: SelectedPlace;
  routeCoordinates?: Coordinate[];
  onMapPress?: MapViewProps['onPress'];
};

const fallbackRegion = {
  latitude: -26.1076,
  longitude: 28.0567,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export const RydoMap = forwardRef<RydoMapHandle, Props>(function RydoMap(
  { currentLocation, pickup, destination, routeCoordinates = [], onMapPress },
  ref,
) {
  const mapRef = useRef<MapView>(null);
  const fitRoute = () => {
    const coordinates = routeCoordinates.length
      ? routeCoordinates
      : [pickup, destination].filter((value): value is SelectedPlace => Boolean(value));

    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 120, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  };

  useImperativeHandle(ref, () => ({ fitRoute }));

  useEffect(() => {
    if (routeCoordinates.length > 1) {
      fitRoute();
    }
  }, [routeCoordinates.length]);

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_GOOGLE}
      style={{ flex: 1 }}
      initialRegion={currentLocation ? { ...currentLocation, latitudeDelta: 0.04, longitudeDelta: 0.04 } : fallbackRegion}
      showsUserLocation
      showsMyLocationButton={false}
      onPress={onMapPress}
    >
      {pickup && <Marker coordinate={pickup} title="Pickup" description={pickup.address} pinColor={colors.blue} />}
      {destination && <Marker coordinate={destination} title="Destination" description={destination.address} pinColor={colors.danger} />}
      {routeCoordinates.length > 1 && <Polyline coordinates={routeCoordinates} strokeColor={colors.blue} strokeWidth={6} />}
    </MapView>
  );
});
