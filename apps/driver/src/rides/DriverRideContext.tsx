import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import type { RideRequest, TripResponse } from './driverApi';

type DriverRideState = {
  pendingRide?: RideRequest;
  activeTrip?: TripResponse;
  setPendingRide: (ride?: RideRequest) => void;
  setActiveTrip: (trip?: TripResponse) => void;
  clearRide: () => void;
};

const DriverRideContext = createContext<DriverRideState | null>(null);

export function DriverRideProvider({ children }: PropsWithChildren) {
  const [pendingRide, setPendingRide] = useState<RideRequest>();
  const [activeTrip, setActiveTrip] = useState<TripResponse>();

  const value = useMemo(
    () => ({
      pendingRide,
      activeTrip,
      setPendingRide,
      setActiveTrip,
      clearRide: () => {
        setPendingRide(undefined);
        setActiveTrip(undefined);
      },
    }),
    [activeTrip, pendingRide],
  );

  return <DriverRideContext.Provider value={value}>{children}</DriverRideContext.Provider>;
}

export function useDriverRide() {
  const context = useContext(DriverRideContext);
  if (!context) {
    throw new Error('useDriverRide must be used inside DriverRideProvider.');
  }

  return context;
}
