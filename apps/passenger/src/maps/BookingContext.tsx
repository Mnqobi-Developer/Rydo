import { PropsWithChildren, createContext, useContext, useMemo, useState } from 'react';
import type { RouteEstimate, SelectedPlace } from './types';
import type { PaymentMethod, TripResponse } from '../trips/tripsApi';

type BookingState = {
  pickup?: SelectedPlace;
  destination?: SelectedPlace;
  route?: RouteEstimate;
  activeTrip?: TripResponse;
  paymentMethod: PaymentMethod;
  autoUseCurrentLocation: boolean;
  setPickup: (place?: SelectedPlace) => void;
  setDestination: (place?: SelectedPlace) => void;
  setRoute: (route?: RouteEstimate) => void;
  setActiveTrip: (trip?: TripResponse) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  enableCurrentLocationPickup: () => void;
  reset: () => void;
};

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: PropsWithChildren) {
  const [pickup, setPickup] = useState<SelectedPlace>();
  const [destination, setDestination] = useState<SelectedPlace>();
  const [route, setRoute] = useState<RouteEstimate>();
  const [activeTrip, setActiveTrip] = useState<TripResponse>();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(1);
  const [autoUseCurrentLocation, setAutoUseCurrentLocation] = useState(true);

  const value = useMemo(
    () => ({
      pickup,
      destination,
      route,
      activeTrip,
      paymentMethod,
      autoUseCurrentLocation,
      setPickup,
      setDestination,
      setRoute,
      setActiveTrip,
      setPaymentMethod,
      enableCurrentLocationPickup: () => setAutoUseCurrentLocation(true),
      reset: () => {
        setPickup(undefined);
        setDestination(undefined);
        setRoute(undefined);
        setActiveTrip(undefined);
        setPaymentMethod(1);
        setAutoUseCurrentLocation(false);
      },
    }),
    [activeTrip, autoUseCurrentLocation, destination, paymentMethod, pickup, route],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used inside BookingProvider.');
  }
  return context;
}
