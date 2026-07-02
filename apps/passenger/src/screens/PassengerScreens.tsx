import { Ionicons } from '@expo/vector-icons';
import {
  AppLogo,
  BottomTabs,
  Card,
  colors,
  Header,
  IconButton,
  LocationField,
  MapCanvas,
  Metric,
  PrimaryButton,
  Screen,
  SecondaryButton,
  Splash,
  textStyles,
} from '@rydo/design-system';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useBooking } from '../maps/BookingContext';
import { autocompletePlaces, computeRoute, getPlace } from '../maps/mapsApi';
import { decodePolyline } from '../maps/polyline';
import { RydoMap } from '../maps/RydoMap';
import type { PlaceSuggestion } from '../maps/types';
import { useCurrentLocation } from '../maps/useCurrentLocation';
import { createPayment } from '../payments/paymentsApi';
import { useSavedPlaces, type SavedPlace } from '../places/SavedPlacesContext';
import { createRating } from '../ratings/ratingsApi';
import { createRideConnection, type TripUpdatedEvent } from '../trips/rideRealtime';
import { createTrip, getPassengerTrips, updateTripStatus, type PaymentMethod, type TripListItem } from '../trips/tripsApi';

export function SplashScreen() {
  return (
    <Pressable style={styles.flex} onPress={() => router.replace('/onboarding')}>
      <Splash />
      <Text style={styles.tapHint}>Tap to continue</Text>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const layout = usePassengerLayout();

  return (
    <Screen>
      <View style={[styles.onboarding, layout.short && styles.onboardingShort, layout.compact && styles.pageCompact]}>
        <Pressable onPress={() => router.replace('/login')}><Text style={textStyles.link}>Skip</Text></Pressable>
        <View style={[styles.heroCircle, layout.compact && styles.heroCircleCompact, layout.short && styles.heroCircleShort]}>
          <Ionicons name="car-sport" size={100} color={colors.blue} />
          <View style={styles.pin}><Ionicons name="location" size={38} color="#fff" /></View>
        </View>
        <Text style={[textStyles.heading, styles.center]}>Ride anywhere <Text style={textStyles.link}>locally</Text></Text>
        <Text style={[textStyles.body, styles.center]}>Book a verified local driver in seconds and travel safely.</Text>
        <View style={styles.dots}><View style={styles.dotActive} /><View style={styles.dot} /><View style={styles.dot} /></View>
        <PrimaryButton label="Next" icon="chevron-forward" onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

export function LoginScreen() {
  return <PassengerAuthScreen mode="signIn" />;
}

export function SignUpScreen() {
  return <PassengerAuthScreen mode="signUp" />;
}

function PassengerAuthScreen({ mode }: { mode: 'signIn' | 'signUp' }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const phoneInputRef = useRef<TextInput>(null);
  const { requestOtp } = useAuth();
  const layout = usePassengerLayout();
  const signingUp = mode === 'signUp';
  const continueWithPhone = async () => {
    if (signingUp && displayName.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }

    if (signingUp && !isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    const formattedPhone = formatSouthAfricanPhone(phoneNumber);
    if (!formattedPhone) {
      Alert.alert('Check your number', 'Enter a valid South African mobile number.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await requestOtp(formattedPhone);
      router.push({ pathname: '/otp', params: { phone: formattedPhone, mode, displayName: displayName.trim(), email: email.trim() } });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.auth, layout.compact && styles.pageCompact, layout.short && styles.authShort]} keyboardShouldPersistTaps="handled">
        <AppLogo />
        <View style={styles.authCopy}>
          <Text style={[textStyles.heading, styles.center]}>{signingUp ? 'Create your Rydo account' : 'Welcome back to Rydo'}</Text>
          <Text style={[textStyles.body, styles.center]}>{signingUp ? 'Sign up with your mobile number to start booking rides' : 'Sign in with your mobile number to continue'}</Text>
        </View>
        {signingUp ? (
          <>
            <TextInput value={displayName} onChangeText={setDisplayName} style={styles.textField} placeholder="Full name" textContentType="name" autoCapitalize="words" />
            <TextInput value={email} onChangeText={setEmail} style={styles.textField} placeholder="Email address" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" />
          </>
        ) : null}
        <Pressable style={styles.phoneField} onPress={() => phoneInputRef.current?.focus()}>
          <Text style={styles.flag}>🇿🇦</Text>
          <Text style={styles.country}>+27</Text>
          <View style={styles.separator} />
          <TextInput ref={phoneInputRef} value={phoneNumber} onChangeText={setPhoneNumber} style={styles.phoneInput} placeholder="72 123 4567" keyboardType="phone-pad" />
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label={submitting ? 'Sending code...' : signingUp ? 'Create Account' : 'Sign In'} disabled={submitting} onPress={continueWithPhone} />
        <Pressable style={styles.authSwitch} onPress={() => router.replace(signingUp ? '/login' : '/signup')}>
          <Text style={styles.muted}>{signingUp ? 'Already have an account?' : "Don't have an account?"} <Text style={textStyles.link}>{signingUp ? 'Sign in' : 'Sign up'}</Text></Text>
        </Pressable>
        <View style={styles.or}><View style={styles.line} /><Text style={styles.muted}>or continue with</Text><View style={styles.line} /></View>
        <SecondaryButton label="Continue with Google" onPress={() => showNotice('Google sign-in', 'Google authentication will be enabled during the authentication integration step.')} />
        <SecondaryButton label="Continue with Apple" onPress={() => showNotice('Apple sign-in', 'Apple authentication will be enabled during the authentication integration step.')} />
        <Text style={[styles.muted, styles.center]}>By continuing, you agree to our Terms of Service and Privacy Policy.</Text>
      </ScrollView>
    </Screen>
  );
}

export function OtpScreen() {
  const layout = usePassengerLayout();
  const params = useLocalSearchParams<{ phone?: string; mode?: string; displayName?: string; email?: string }>();
  const phoneNumber = typeof params.phone === 'string' ? params.phone : '';
  const signingUp = params.mode === 'signUp';
  const displayName = typeof params.displayName === 'string' ? params.displayName : undefined;
  const email = typeof params.email === 'string' ? params.email : undefined;
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const { requestOtp, verifyOtp } = useAuth();

  const verifyCode = async () => {
    if (!phoneNumber) {
      router.replace('/login');
      return;
    }

    if (code.length !== 6) {
      setError('Enter the 6-digit code sent to your phone.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await verifyOtp(phoneNumber, code, signingUp ? { displayName, email } : undefined);
      router.replace('/home');
    } catch (verifyError) {
      setError(getRequestErrorMessage(verifyError));
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!phoneNumber) {
      router.replace('/login');
      return;
    }

    setError('');
    try {
      await requestOtp(phoneNumber);
      Alert.alert('Code sent', 'A new verification code has been requested.');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    }
  };

  return (
    <Screen>
      <View style={[styles.page, layout.compact && styles.pageCompact, layout.short && styles.pageShort]}>
        <IconButton icon="chevron-back" onPress={() => safeBack('/login')} />
        <View style={styles.section}>
          <Text style={textStyles.heading}>Verify Your Number</Text>
          <Text style={textStyles.body}>We've sent a 6-digit code to <Text style={textStyles.link}>{phoneNumber || 'your phone'}</Text> to {signingUp ? 'create your account' : 'sign you in'}.</Text>
        </View>
        <Pressable style={styles.otpEntry} onPress={() => otpInputRef.current?.focus()}>
          <View style={styles.otpRow}>
          {Array.from({ length: 6 }).map((_, index) => <View key={index} style={[styles.otpBox, index === code.length && styles.otpActive]}><Text style={styles.otpText}>{code[index] ?? ''}</Text></View>)}
          </View>
          <TextInput
            ref={otpInputRef}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textContentType="oneTimeCode"
            style={styles.hiddenOtpInput}
          />
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable onPress={() => void resendCode()}><Text style={[textStyles.link, styles.center]}>Resend code</Text></Pressable>
        <Card style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={36} color={colors.blue} />
          <View style={styles.flex}><Text style={styles.strong}>Secure verification</Text><Text style={styles.muted}>Your phone number is safe with us.</Text></View>
        </Card>
        <View style={styles.bottom}><PrimaryButton label={submitting ? 'Verifying...' : 'Verify and Continue'} disabled={submitting} onPress={() => void verifyCode()} /></View>
      </View>
    </Screen>
  );
}

export function HomeScreen() {
  const { pickup, destination, route, setPickup, setDestination, setRoute } = useBooking();
  const { location, permissionDenied, loading, refresh } = useCurrentLocation();
  const { loading: authLoading, session } = useAuth();
  const { home, work, favorites } = useSavedPlaces();
  const layout = usePassengerLayout();
  const routeCoordinates = useMemo(() => decodePolyline(route?.encodedPolyline ?? ''), [route?.encodedPolyline]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [authLoading, session]);

  useEffect(() => {
    if (!pickup && location) {
      setPickup(location);
    }
  }, [location, pickup, setPickup]);

  const useSavedDestination = (savedPlace?: SavedPlace) => {
    if (!savedPlace) {
      router.push('/activity');
      return;
    }

    setDestination(savedPlace.place);
    setRoute(undefined);
    router.push('/book');
  };

  return (
    <Screen>
      {authLoading ? <View style={styles.loadingOverlay}><ActivityIndicator color={colors.blue} size="large" /></View> : null}
      <View style={styles.mapLayer}>
        <RydoMap currentLocation={location} pickup={pickup} destination={destination} routeCoordinates={routeCoordinates} />
      </View>
      <View style={[styles.mapHeader, layout.compact && styles.edgeCompact]}>
        <IconButton icon="menu" onPress={() => router.push('/profile')} />
        <Header subtitle="Good morning," title={'Where are you\ngoing?'} />
        <IconButton icon="notifications" onPress={() => router.push('/notifications')} />
      </View>
      <View style={[styles.booking, layout.compact && styles.bookingCompact, layout.short && styles.bookingShort]}>
        <Pressable onPress={() => router.push('/book')}>
          <LocationField
            label={loading ? 'Finding your location...' : permissionDenied ? 'Location permission required' : 'Pickup location'}
            value={pickup?.address ?? 'Choose pickup location'}
          />
        </Pressable>
        <Pressable onPress={() => router.push('/book')}>
          <LocationField destination value={destination?.address ?? 'Where are you going?'} />
        </Pressable>
        {permissionDenied && <SecondaryButton label="Enable Location" onPress={() => void refresh()} />}
        {route && (
          <View style={styles.routeSummary}>
            <Text style={styles.strong}>{formatDistance(route.distanceMeters)} • {formatDuration(route.durationSeconds)}</Text>
            <Text style={styles.fareInline}>{formatFare(route.estimatedFare)}</Text>
          </View>
        )}
        <View style={[styles.quickRow, layout.compact && styles.quickRowCompact]}>
          <Quick icon="home" label="Home" sub={home ? home.place.name : 'Add'} onPress={() => useSavedDestination(home)} />
          <Quick icon="briefcase" label="Work" sub={work ? work.place.name : 'Add'} onPress={() => useSavedDestination(work)} />
          <Quick icon="star" label="Favorites" sub={`${favorites.length} saved`} onPress={() => router.push('/activity')} />
        </View>
        <PrimaryButton label={route ? 'Choose Ride' : 'Plan Your Ride'} onPress={() => router.push(route ? '/ride-selection' : '/book')} />
      </View>
      <View style={styles.tabs}><PassengerTabs active="Home" /></View>
    </Screen>
  );
}

export function BookRideScreen() {
  const { pickup, destination, route, paymentMethod, setPickup, setDestination, setRoute, setPaymentMethod } = useBooking();
  const { location, permissionDenied, loading: locationLoading, refresh } = useCurrentLocation();
  const { savePlace } = useSavedPlaces();
  const layout = usePassengerLayout();
  const [activeField, setActiveField] = useState<'pickup' | 'destination'>('destination');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState('');
  const routeCoordinates = useMemo(() => decodePolyline(route?.encodedPolyline ?? ''), [route?.encodedPolyline]);

  useEffect(() => {
    if (!pickup && location) {
      setPickup(location);
    }
  }, [location, pickup, setPickup]);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        setSuggestions(await autocompletePlaces(query.trim(), location));
      } catch (requestError) {
        setError(readError(requestError));
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [location, query]);

  const chooseSuggestion = async (suggestion: PlaceSuggestion) => {
    setSearching(true);
    setError('');
    try {
      const place = await getPlace(suggestion.placeId);
      if (activeField === 'pickup') {
        setPickup(place);
        setActiveField('destination');
      } else {
        setDestination(place);
      }
      setRoute(undefined);
      setQuery('');
      setSuggestions([]);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setSearching(false);
    }
  };

  const calculateRoute = async () => {
    if (!pickup || !destination) {
      return;
    }
    setRouteLoading(true);
    setError('');
    try {
      setRoute(await computeRoute(pickup, destination));
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setRouteLoading(false);
    }
  };

  const saveSelectedPlace = async (kind: 'home' | 'work' | 'favorite') => {
    const place = kind === 'home' ? pickup : destination;
    if (!place) {
      showNotice('Choose a place first', kind === 'home' ? 'Choose your pickup location before saving home.' : 'Choose a destination before saving this place.');
      return;
    }

    await savePlace(kind, place);
    showNotice('Saved place', `${kind === 'favorite' ? place.name : kind === 'home' ? 'Home' : 'Work'} has been saved.`);
  };

  return (
    <Screen>
      <View style={styles.mapLayer}>
        <RydoMap currentLocation={location} pickup={pickup} destination={destination} routeCoordinates={routeCoordinates} />
      </View>
      <View style={[styles.topControls, layout.compact && styles.edgeCompact]}>
        <IconButton icon="chevron-back" onPress={() => safeBack('/home')} />
        <IconButton icon="locate" onPress={() => void refresh()} />
      </View>
      <ScrollView
        style={[styles.bookSheet, layout.compact && styles.bookSheetCompact, layout.short && styles.bookSheetShort]}
        contentContainerStyle={styles.sheetContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={textStyles.subheading}>Plan your ride</Text>
        <Pressable onPress={() => setActiveField('pickup')} style={[activeField === 'pickup' && styles.activeField]}>
          <LocationField
            label={locationLoading ? 'Finding current location...' : 'Pickup'}
            value={pickup?.address ?? 'Choose pickup location'}
          />
        </Pressable>
        <Pressable onPress={() => setActiveField('destination')} style={[activeField === 'destination' && styles.activeField]}>
          <LocationField destination label="Destination" value={destination?.address ?? 'Choose destination'} />
        </Pressable>
        <View style={styles.searchInput}>
          <Ionicons name="search" size={21} color={colors.blue} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${activeField}`}
            placeholderTextColor={colors.muted}
            style={styles.searchText}
            autoFocus={Boolean(!destination)}
          />
          {searching && <ActivityIndicator color={colors.blue} />}
        </View>
        {suggestions.length > 0 && (
          <ScrollView style={[styles.suggestions, layout.short && styles.suggestionsShort]} keyboardShouldPersistTaps="handled">
            {suggestions.map((suggestion) => (
              <Pressable key={suggestion.placeId} onPress={() => void chooseSuggestion(suggestion)} style={styles.suggestion}>
                <Ionicons name="location-outline" size={22} color={colors.blue} />
                <View style={styles.flex}>
                  <Text style={styles.strong}>{suggestion.primaryText}</Text>
                  <Text style={styles.muted}>{suggestion.secondaryText}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
        {permissionDenied && <SecondaryButton label="Allow Current Location" onPress={() => void refresh()} />}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {(pickup || destination) && (
          <Card style={styles.saveCard}>
            <Text style={styles.strong}>Save places</Text>
            <View style={styles.saveActions}>
              <Pressable disabled={!pickup} onPress={() => void saveSelectedPlace('home')} style={[styles.saveChip, !pickup && styles.disabledChip]}><Ionicons name="home" size={18} color={colors.blue} /><Text style={styles.saveChipText}>Home</Text></Pressable>
              <Pressable disabled={!destination} onPress={() => void saveSelectedPlace('work')} style={[styles.saveChip, !destination && styles.disabledChip]}><Ionicons name="briefcase" size={18} color={colors.blue} /><Text style={styles.saveChipText}>Work</Text></Pressable>
              <Pressable disabled={!destination} onPress={() => void saveSelectedPlace('favorite')} style={[styles.saveChip, !destination && styles.disabledChip]}><Ionicons name="star" size={18} color={colors.blue} /><Text style={styles.saveChipText}>Favorite</Text></Pressable>
            </View>
          </Card>
        )}
        {route && (
          <Card style={styles.routeSummary}>
            <View>
              <Text style={styles.strong}>{formatDistance(route.distanceMeters)} - {formatDuration(route.durationSeconds)}</Text>
              <Text style={styles.muted}>Estimated Rydo Go fare</Text>
            </View>
            <Text style={styles.fareInline}>{formatFare(route.estimatedFare)}</Text>
          </Card>
        )}
        <Card style={styles.paymentPlanCard}>
          <Text style={styles.strong}>Payment plan</Text>
          <Text style={styles.muted}>Choose how you want to pay for this ride.</Text>
          <View style={styles.paymentPlanGrid}>
            <PaymentOption method={1} active={paymentMethod === 1} title="Cash" detail="Pay driver" icon="cash" onPress={setPaymentMethod} />
            <PaymentOption method={2} active={paymentMethod === 2} title="Card" detail="Pay in app" icon="card" onPress={setPaymentMethod} />
          </View>
        </Card>
        <PrimaryButton
          label={routeLoading ? 'Calculating route...' : route ? 'Choose Ride' : 'Preview Route'}
          disabled={!pickup || !destination || routeLoading}
          onPress={() => route ? router.push('/ride-selection') : void calculateRoute()}
        />
      </ScrollView>
    </Screen>
  );
}

export function RideSelectionScreen() {
  const { pickup, destination, route, paymentMethod, setActiveTrip } = useBooking();
  const { session } = useAuth();
  const layout = usePassengerLayout();
  const routeCoordinates = useMemo(() => decodePolyline(route?.encodedPolyline ?? ''), [route?.encodedPolyline]);
  const baseFare = route?.estimatedFare ?? 0;
  const rides = [
    ['Rydo Go', 'Affordable standard rides', formatFare(baseFare), 'car-sport'],
    ['Rydo XL', 'Larger vehicles for groups', formatFare(baseFare * 1.35), 'bus'],
    ['Rydo Comfort', 'Premium rides with top drivers', formatFare(baseFare * 1.65), 'sparkles'],
  ] as const;
  const [selected, setSelected] = useState('Rydo Go');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const confirmRide = async () => {
    if (!session) {
      router.replace('/login');
      return;
    }

    if (!pickup || !destination) {
      setError('Choose a pickup and destination first.');
      return;
    }

    const rideType = selected === 'Rydo XL' ? 2 : selected === 'Rydo Comfort' ? 3 : 1;
    setSubmitting(true);
    setError('');
    try {
      const trip = await createTrip({ session, pickup, destination, route, rideType, paymentMethod });
      setActiveTrip(trip);
      router.push('/matching');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.mapLayer}>
        <RydoMap pickup={pickup} destination={destination} routeCoordinates={routeCoordinates} />
      </View>
      <View style={[styles.topControls, layout.compact && styles.edgeCompact]}><IconButton icon="chevron-back" onPress={() => safeBack('/book')} /><IconButton icon="options" onPress={() => showNotice('Ride options', 'Fares include the current route estimate. Select a ride type to continue.')} /></View>
      <ScrollView style={[styles.sheet, layout.compact && styles.sheetCompact, layout.short && styles.sheetShort]} contentContainerStyle={styles.sheetContent}>
        <Text style={textStyles.subheading}>Choose your ride</Text>
        <Text style={textStyles.body}>
          {destination?.name ?? 'Destination'} • {route ? formatDistance(route.distanceMeters) : 'Route required'}
        </Text>
        <Card style={styles.paymentSummary}>
          <Ionicons name={paymentIcon(paymentMethod)} size={22} color={colors.blue} />
          <View style={styles.flex}>
            <Text style={styles.strong}>{paymentMethodLabel(paymentMethod)}</Text>
            <Text style={styles.muted}>{paymentMethod === 1 ? 'Pay the driver at drop-off' : 'Card payment selected for this ride'}</Text>
          </View>
        </Card>
        {rides.map(([name, description, price, icon]) => (
          <Pressable key={name} onPress={() => setSelected(name)} style={[styles.ride, selected === name && styles.selected]}>
            <View style={styles.rideIcon}><Ionicons name={icon} size={30} color={colors.blue} /></View>
            <View style={styles.flex}><Text style={styles.strong}>{name}</Text><Text style={styles.muted}>{description}</Text></View>
            <Text style={styles.strong}>{price}</Text>
          </Pressable>
        ))}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label={submitting ? 'Requesting ride...' : `Confirm ${selected}`} disabled={submitting} onPress={() => void confirmRide()} />
      </ScrollView>
    </Screen>
  );
}

export function MatchingScreen() {
  const layout = usePassengerLayout();
  const { session } = useAuth();
  const { activeTrip, setActiveTrip } = useBooking();
  const [statusText, setStatusText] = useState('Waiting for nearby drivers...');

  useEffect(() => {
    if (!session) {
      router.replace('/login');
      return;
    }

    if (!activeTrip) {
      router.replace('/ride-selection');
      return;
    }

    let disposed = false;
    const connection = createRideConnection(session.accessToken);

    connection.on('trip.updated', (trip: TripUpdatedEvent) => {
      const tripId = trip.tripId ?? trip.id;
      if (tripId !== activeTrip.tripId) {
        return;
      }

      const nextTrip = { ...activeTrip, ...trip, tripId };
      setActiveTrip(nextTrip);

      if (trip.status >= 3) {
        router.replace('/arriving');
      } else {
        setStatusText('Still searching for an available driver...');
      }
    });

    connection
      .start()
      .then(() => connection.invoke('JoinTrip', activeTrip.tripId))
      .catch(() => {
        if (!disposed) {
          setStatusText('Realtime connection failed. Keep this screen open and retry if needed.');
        }
      });

    return () => {
      disposed = true;
      void connection.stop();
    };
  }, [activeTrip, session, setActiveTrip]);

  return (
    <Screen map>
      <View style={[styles.mapHeader, layout.compact && styles.edgeCompact]}><IconButton icon="chevron-back" onPress={() => safeBack('/ride-selection')} /><Header title="Finding you a driver..." subtitle="Searching nearby drivers" /></View>
      <View style={[styles.searchRing, layout.compact && styles.searchRingCompact, layout.short && styles.searchRingShort]}><View style={styles.searchCenter}><Ionicons name="car-sport" size={32} color={colors.blue} /></View></View>
      <Card style={[styles.matchStats, layout.compact && styles.edgeCompact, layout.short && styles.matchStatsShort]}><Metric value="02:15" label="Est. wait" /><Metric value="6" label="Drivers nearby" /><Metric value="1.2 km" label="Search radius" /></Card>
      <View style={[styles.matchBottom, layout.compact && styles.matchBottomCompact]}>
        <Card style={styles.infoCard}><Ionicons name="shield-checkmark" size={36} color={colors.blue} /><View style={styles.flex}><Text style={styles.strong}>Finding the best driver for you</Text><Text style={styles.muted}>{statusText}</Text></View></Card>
        <SecondaryButton label="Cancel Ride" danger onPress={() => router.replace('/home')} />
      </View>
    </Screen>
  );
}

export function ArrivingScreen() {
  const layout = usePassengerLayout();
  const { session } = useAuth();
  const { activeTrip, setActiveTrip } = useBooking();
  const [statusText, setStatusText] = useState('Your driver is on the way.');
  const shareTrip = () => void Share.share({ message: `Follow my Rydo trip from ${activeTrip?.pickupAddress ?? 'pickup'} to ${activeTrip?.destinationAddress ?? 'destination'}.` });

  useEffect(() => {
    if (!session || !activeTrip) {
      router.replace('/home');
      return;
    }

    let disposed = false;
    const connection = createRideConnection(session.accessToken);
    connection.on('trip.updated', (trip: TripUpdatedEvent) => {
      const tripId = trip.tripId ?? trip.id;
      if (tripId !== activeTrip.tripId) {
        return;
      }

      const nextTrip = { ...activeTrip, ...trip, tripId };
      setActiveTrip(nextTrip);

      if (trip.status === 4) {
        setStatusText('Your driver has arrived at pickup.');
      } else if (trip.status === 5) {
        router.replace('/trip');
      } else if (trip.status === 6) {
        router.replace('/payment');
      }
    });

    connection
      .start()
      .then(() => connection.invoke('JoinTrip', activeTrip.tripId))
      .catch(() => {
        if (!disposed) {
          setStatusText('Realtime updates paused. Keep this screen open while we reconnect.');
        }
      });

    return () => {
      disposed = true;
      void connection.stop();
    };
  }, [activeTrip, session, setActiveTrip]);

  if (!activeTrip) {
    return null;
  }

  return (
    <Screen map>
      <MapCanvas route />
      <View style={[styles.topControls, layout.compact && styles.edgeCompact]}><IconButton icon="chevron-down" onPress={() => router.replace('/home')} /><IconButton icon="share-social" onPress={shareTrip} /></View>
      <Card style={[styles.driverCard, layout.compact && styles.driverCardCompact, layout.short && styles.driverCardShort]}>
        <AssignedDriver trip={activeTrip} />
        <View style={styles.metrics}><Metric value={activeTrip.status === 4 ? 'Arrived' : '2 min'} label="Status" /><Metric value={formatFare(activeTrip.estimatedFare)} label="Fare" /><Metric value={paymentMethodLabel(activeTrip.preferredPaymentMethod)} label="Payment" /></View>
      </Card>
      <ScrollView style={[styles.tripPanel, layout.compact && styles.tripPanelCompact, layout.short && styles.tripPanelShort]} contentContainerStyle={styles.sheetContent}>
        <Text style={styles.strong}>{statusText}</Text>
        <LocationField label="Pickup" value={activeTrip.pickupAddress} />
        <LocationField destination label="Destination" value={activeTrip.destinationAddress} />
        <View style={[styles.quickRow, layout.compact && styles.quickRowCompact]}>
          <Quick icon="call" label="Call" onPress={() => void Linking.openURL('tel:+27721234567')} />
          <Quick icon="chatbubble" label="Message" onPress={() => void Linking.openURL('sms:+27721234567')} />
          <Quick icon="shield-checkmark" label="Safety" onPress={() => showNotice('Safety centre', 'Your driver is verified. Share the trip or call emergency services if you feel unsafe.')} />
        </View>
        {activeTrip.status === 4 ? <PrimaryButton label="Waiting for driver to start trip" disabled onPress={() => undefined} /> : null}
      </ScrollView>
    </Screen>
  );
}

export function ActiveTripScreen() {
  const layout = usePassengerLayout();
  const { session } = useAuth();
  const { activeTrip, setActiveTrip } = useBooking();
  const [statusText, setStatusText] = useState('Trip in progress');
  const confirmEmergency = () => Alert.alert('Emergency SOS', 'Call emergency services now?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Call 112', style: 'destructive', onPress: () => void Linking.openURL('tel:112') },
  ]);

  useEffect(() => {
    if (!session || !activeTrip) {
      router.replace('/home');
      return;
    }

    let disposed = false;
    const connection = createRideConnection(session.accessToken);
    connection.on('trip.updated', (trip: TripUpdatedEvent) => {
      const tripId = trip.tripId ?? trip.id;
      if (tripId !== activeTrip.tripId) {
        return;
      }

      const nextTrip = { ...activeTrip, ...trip, tripId };
      setActiveTrip(nextTrip);

      if (trip.status === 6) {
        router.replace('/payment');
      } else if (trip.status === 7) {
        setStatusText('This trip was cancelled.');
      }
    });

    connection
      .start()
      .then(() => connection.invoke('JoinTrip', activeTrip.tripId))
      .catch(() => {
        if (!disposed) {
          setStatusText('Realtime updates paused. Keep this screen open while we reconnect.');
        }
      });

    return () => {
      disposed = true;
      void connection.stop();
    };
  }, [activeTrip, session, setActiveTrip]);

  if (!activeTrip) {
    return null;
  }

  return (
    <Screen map>
      <MapCanvas dark route />
      <View style={[styles.topControls, layout.compact && styles.edgeCompact]}><IconButton icon="chevron-down" onPress={() => router.replace('/home')} /><IconButton icon="medkit" danger onPress={confirmEmergency} /></View>
      <ScrollView style={[styles.tripPanel, layout.compact && styles.tripPanelCompact, layout.short && styles.tripPanelShort]} contentContainerStyle={styles.sheetContent}>
        <Text style={textStyles.subheading}>On trip to {activeTrip.destinationAddress}</Text>
        <Text style={styles.eta}>{statusText}</Text>
        <Text style={styles.muted}>{formatFare(activeTrip.estimatedFare)} • {paymentMethodLabel(activeTrip.preferredPaymentMethod)}</Text>
        <View style={styles.progress}><View style={styles.progressFill} /></View>
        <AssignedDriver trip={activeTrip} />
        <PrimaryButton label="Waiting for driver to complete trip" disabled onPress={() => undefined} />
      </ScrollView>
    </Screen>
  );
}

export function PaymentScreen() {
  const { session } = useAuth();
  const { route, destination, activeTrip, paymentMethod, setPaymentMethod } = useBooking();
  const selectedMethod = paymentMethod;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const layout = usePassengerLayout();

  useEffect(() => {
    if (activeTrip?.preferredPaymentMethod) {
      setPaymentMethod(activeTrip.preferredPaymentMethod);
    }
  }, [activeTrip?.preferredPaymentMethod, setPaymentMethod]);

  const confirmPayment = async () => {
    if (!session || !activeTrip) {
      router.replace('/home');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createPayment({
        accessToken: session.accessToken,
        tripId: activeTrip.tripId,
        method: selectedMethod,
        amount: activeTrip.estimatedFare ?? route?.estimatedFare ?? 0,
      });
      Alert.alert(
        `${paymentMethodLabel(selectedMethod)} selected`,
        selectedMethod === 1 ? 'Pay the driver at drop-off.' : `${paymentMethodLabel(selectedMethod)} payment has been recorded for this MVP trip.`,
        [{ text: 'Continue', onPress: () => router.replace('/rating') }],
      );
    } catch (paymentError) {
      setError(getRequestErrorMessage(paymentError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.compact && styles.pageCompact]} keyboardShouldPersistTaps="handled">
        <Text style={textStyles.heading}>Payment</Text>
        <Card style={styles.fareCard}><Text style={styles.muted}>Trip fare</Text><Text style={styles.fare}>{formatFare(activeTrip?.estimatedFare ?? route?.estimatedFare ?? 0)}</Text><Text style={styles.muted}>Trip to {destination?.name ?? activeTrip?.destinationAddress ?? 'your destination'}</Text></Card>
        {paymentOptions.map((option) => (
          <Pressable key={option.method} onPress={() => setPaymentMethod(option.method)} style={[styles.payment, selectedMethod === option.method && styles.selected]}>
            <Ionicons name={option.icon} size={28} color={colors.blue} />
            <View style={styles.flex}><Text style={styles.strong}>{option.title}</Text><Text style={styles.muted}>{option.detail}</Text></View>
            {selectedMethod === option.method && <Ionicons name="checkmark-circle" size={24} color={colors.blue} />}
          </Pressable>
        ))}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label={submitting ? 'Confirming payment...' : `Confirm ${paymentMethodLabel(selectedMethod)} Payment`} disabled={submitting} onPress={() => void confirmPayment()} />
      </ScrollView>
    </Screen>
  );
}

export function RatingScreen() {
  const [stars, setStars] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { session } = useAuth();
  const { activeTrip, reset } = useBooking();
  const layout = usePassengerLayout();
  const toggleTag = (tag: string) => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  const submitRating = async () => {
    if (!session || !activeTrip) {
      router.replace('/home');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await createRating({
        accessToken: session.accessToken,
        tripId: activeTrip.tripId,
        fromUserId: session.userId,
        toUserId: activeTrip.driver?.userId ?? session.userId,
        stars,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      });
    } catch (ratingError) {
      setError(getRequestErrorMessage(ratingError));
      setSubmitting(false);
      return;
    }

    reset();
    Alert.alert('Thank you', `Your ${stars}-star rating was submitted.`, [{ text: 'Done', onPress: () => router.replace('/home') }]);
  };
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.compact && styles.pageCompact]} keyboardShouldPersistTaps="handled">
        <Text style={textStyles.heading}>Rate your trip</Text>
        {activeTrip ? <AssignedDriver trip={activeTrip} /> : <EmptyState icon="star-outline" title="No trip to rate" detail="Complete a ride before rating a driver." />}
        <View style={styles.starRow}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} onPress={() => setStars(star)}><Ionicons name="star" size={40} color={star <= stars ? colors.amber : colors.line} /></Pressable>)}</View>
        <View style={styles.tags}>{['Clean Car', 'Friendly', 'Safe Driving', 'Late', 'Poor Navigation'].map((tag) => <Pressable key={tag} onPress={() => toggleTag(tag)} style={[styles.tag, selectedTags.includes(tag) && styles.tagSelected]}><Text style={[styles.strong, selectedTags.includes(tag) && styles.tagSelectedText]}>{tag}</Text></Pressable>)}</View>
        <TextInput value={comment} onChangeText={setComment} style={styles.comment} placeholder="Leave a note for your driver" multiline />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label={submitting ? 'Submitting rating...' : 'Submit Rating'} disabled={submitting} onPress={() => void submitRating()} />
      </ScrollView>
    </Screen>
  );
}

export function TripsScreen() {
  const layout = usePassengerLayout();
  const { session } = useAuth();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) {
      router.replace('/login');
      return;
    }

    let mounted = true;
    setLoadingTrips(true);
    getPassengerTrips(session.userId, session.accessToken)
      .then((items) => {
        if (mounted) {
          setTrips(items);
        }
      })
      .catch((requestError) => {
        if (mounted) {
          setError(getRequestErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingTrips(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, styles.tabbedPage, layout.compact && styles.pageCompact]}>
        <Header title="Your trips" subtitle="Recent rides" />
        {loadingTrips ? <ActivityIndicator color={colors.blue} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loadingTrips && trips.length === 0 ? <EmptyState icon="receipt" title="No trips yet" detail="Completed rides will appear here after your first Rydo trip." /> : null}
        {trips.map((trip) => <TripHistoryItem key={trip.tripId} trip={trip} />)}
      </ScrollView>
      <View style={styles.tabs}><PassengerTabs active="Trips" /></View>
    </Screen>
  );
}

export function ActivityScreen() {
  const layout = usePassengerLayout();
  const { home, work, favorites, removePlace } = useSavedPlaces();
  const { setDestination, setRoute } = useBooking();

  const useSavedPlace = (savedPlace: SavedPlace) => {
    setDestination(savedPlace.place);
    setRoute(undefined);
    router.push('/book');
  };

  const removeSavedPlace = async (savedPlace: SavedPlace) => {
    await removePlace(savedPlace.id);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, styles.tabbedPage, layout.compact && styles.pageCompact]}>
        <Header title="Activity" subtitle="Saved places and updates" />
        <Card>
          <Text style={styles.strong}>Saved places</Text>
          {home ? <SavedPlaceRow icon="home" savedPlace={home} onUse={useSavedPlace} onRemove={removeSavedPlace} /> : <ActionRow icon="home" title="Home" detail="Choose a pickup location, then save it as Home." onPress={() => router.push('/book')} />}
          {work ? <SavedPlaceRow icon="briefcase" savedPlace={work} onUse={useSavedPlace} onRemove={removeSavedPlace} /> : <ActionRow icon="briefcase" title="Work" detail="Choose a destination, then save it as Work." onPress={() => router.push('/book')} />}
          {favorites.length > 0 ? favorites.map((favorite) => <SavedPlaceRow key={favorite.id} icon="star" savedPlace={favorite} onUse={useSavedPlace} onRemove={removeSavedPlace} />) : <ActionRow icon="star" title="Favorites" detail="Save destinations you use often." onPress={() => router.push('/book')} />}
        </Card>
        <Card><Text style={styles.strong}>Recent activity</Text><Text style={styles.muted}>Ride updates, safety alerts, and promotions will appear here when they are available.</Text></Card>
      </ScrollView>
      <View style={styles.tabs}><PassengerTabs active="Activity" /></View>
    </Screen>
  );
}

export function ProfileScreen() {
  const layout = usePassengerLayout();
  const { session, signOut } = useAuth();
  const { places } = useSavedPlaces();
  const displayName = session?.displayName?.trim() || 'Your profile';
  const displayPhone = session?.phoneNumber;
  const displayEmail = session?.email;
  const savedPlacesDetail = places.length === 0 ? 'No saved places yet' : `${places.length} saved ${places.length === 1 ? 'place' : 'places'}`;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, styles.tabbedPage, layout.compact && styles.pageCompact]}>
        <Header title="Profile" subtitle="Passenger account" action={<IconButton icon="notifications" onPress={() => router.push('/notifications')} />} />
        <Card style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitials}>{getInitials(displayName)}</Text></View><View style={styles.flex}><Text style={textStyles.subheading}>{displayName}</Text>{displayPhone ? <Text style={styles.muted}>{displayPhone}</Text> : null}{displayEmail ? <Text style={styles.muted}>{displayEmail}</Text> : null}</View></Card>
        <Card>
          <ActionRow icon="wallet" title="Wallet" detail="Balance R0.00" onPress={() => showNotice('Rydo Wallet', 'Wallet top-ups will be available when payment providers are integrated.')} />
          <ActionRow icon="location" title="Saved places" detail={savedPlacesDetail} onPress={() => router.push('/activity')} />
          <ActionRow icon="shield-checkmark" title="Safety" detail="Emergency contacts and trip sharing" onPress={() => showNotice('Safety settings', 'Trip sharing and emergency calling are active in the trip flow.')} />
          <ActionRow icon="help-circle" title="Help" detail="Support and trip disputes" onPress={() => void Linking.openURL('mailto:support@rydo.co.za')} />
        </Card>
        <SecondaryButton label="Sign Out" danger onPress={() => void handleSignOut()} />
      </ScrollView>
      <View style={styles.tabs}><PassengerTabs active="Profile" /></View>
    </Screen>
  );
}

export function NotificationsScreen() {
  const layout = usePassengerLayout();

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.compact && styles.pageCompact]}>
        <IconButton icon="chevron-back" onPress={() => safeBack('/home')} />
        <Header title="Notifications" subtitle="Your latest Rydo updates" />
        <EmptyState icon="notifications" title="No notifications yet" detail="Trip alerts and account updates will appear here." />
      </ScrollView>
    </Screen>
  );
}

function PassengerTabs({ active }: { active: string }) {
  const routes: Record<string, '/home' | '/trips' | '/activity' | '/profile'> = { Home: '/home', Trips: '/trips', Activity: '/activity', Profile: '/profile' };
  return <BottomTabs active={active} onPress={(label) => router.replace(routes[label])} items={[{ label: 'Home', icon: 'home' }, { label: 'Trips', icon: 'time' }, { label: 'Activity', icon: 'receipt' }, { label: 'Profile', icon: 'person' }]} />;
}

function Quick({ icon, label, sub, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} style={styles.quick}><Ionicons name={icon} size={24} color={colors.blue} /><Text style={styles.strong}>{label}</Text>{sub ? <Text style={styles.muted}>{sub}</Text> : null}</Pressable>;
}

function AssignedDriver({ trip }: { trip: NonNullable<ReturnType<typeof useBooking>['activeTrip']> }) {
  const driver = trip.driver;
  const name = driver?.name ?? 'Assigned driver';
  const vehicle = [driver?.vehicleModel, driver?.vehicleColour].filter(Boolean).join(' • ');

  return (
    <View style={styles.assignedDriver}>
      <View style={styles.profileAvatarSmall}><Text style={styles.profileInitials}>{getInitials(name)}</Text></View>
      <View style={styles.flex}>
        <View style={styles.driverTitle}>
          <Text style={styles.strong}>{name}</Text>
          {driver?.isVerified ? <Ionicons name="shield-checkmark" size={18} color={colors.blue} /> : null}
          {driver?.ratingAverage ? <Text style={styles.ratingText}>★ {driver.ratingAverage.toFixed(1)}</Text> : null}
        </View>
        <Text style={styles.muted}>{vehicle || 'Vehicle details pending'}</Text>
        {driver?.numberPlate ? <Text style={styles.plateText}>{driver.numberPlate}</Text> : <Text style={styles.plateText}>Driver assigned</Text>}
      </View>
    </View>
  );
}

const paymentOptions: Array<{ method: PaymentMethod; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { method: 1, title: 'Cash', detail: 'Pay the driver at drop-off', icon: 'cash' },
  { method: 2, title: 'Card', detail: 'Pay securely in app', icon: 'card' },
];

function PaymentOption({ method, active, title, detail, icon, onPress }: { method: PaymentMethod; active: boolean; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; onPress: (method: PaymentMethod) => void }) {
  return (
    <Pressable onPress={() => onPress(method)} style={[styles.paymentPlanOption, active && styles.selected]}>
      <Ionicons name={icon} size={24} color={colors.blue} />
      <View style={styles.flex}>
        <Text style={styles.strong}>{title}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={colors.blue} /> : null}
    </Pressable>
  );
}

function usePassengerLayout() {
  const { width, height } = useWindowDimensions();

  return {
    compact: width <= 360,
    short: height <= 700,
  };
}

function formatSouthAfricanPhone(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length === 9) {
    return `+27${digits}`;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return `+27${digits.slice(1)}`;
  }

  if (digits.length === 11 && digits.startsWith('27')) {
    return `+${digits}`;
  }

  return '';
}

function getRequestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'RY';
}

function ActionRow({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress?: () => void }) {
  return <Pressable onPress={onPress} disabled={!onPress} style={styles.actionRow}><View style={styles.actionIcon}><Ionicons name={icon} size={22} color={colors.blue} /></View><View style={styles.flex}><Text style={styles.strong}>{title}</Text><Text style={styles.muted}>{detail}</Text></View>{onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}</Pressable>;
}

function EmptyState({ icon, title, detail }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }) {
  return <Card style={styles.emptyState}><Ionicons name={icon} size={32} color={colors.blue} /><Text style={styles.strong}>{title}</Text><Text style={[styles.muted, styles.center]}>{detail}</Text></Card>;
}

function TripHistoryItem({ trip }: { trip: TripListItem }) {
  return <Card><View style={styles.routeSummary}><View style={styles.flex}><Text style={styles.strong}>{trip.pickupAddress} to {trip.destinationAddress}</Text><Text style={styles.muted}>{formatDate(trip.completedAtUtc ?? trip.requestedAtUtc)} • {tripStatusLabel(trip.status)}</Text></View><Text style={styles.fareInline}>{formatFare(trip.fare)}</Text></View><Pressable onPress={() => router.push('/book')}><Text style={[textStyles.link, styles.historyAction]}>Book again</Text></Pressable></Card>;
}

function SavedPlaceRow({ icon, savedPlace, onUse, onRemove }: { icon: keyof typeof Ionicons.glyphMap; savedPlace: SavedPlace; onUse: (place: SavedPlace) => void; onRemove: (place: SavedPlace) => Promise<void> }) {
  return (
    <View style={styles.savedPlaceRow}>
      <Pressable onPress={() => onUse(savedPlace)} style={styles.savedPlaceMain}>
        <View style={styles.actionIcon}><Ionicons name={icon} size={22} color={colors.blue} /></View>
        <View style={styles.flex}>
          <Text style={styles.strong}>{savedPlace.label}</Text>
          <Text style={styles.muted}>{savedPlace.place.address}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => void onRemove(savedPlace)} style={styles.removePlaceButton}>
        <Ionicons name="trash-outline" size={18} color="#e11d48" />
      </Pressable>
    </View>
  );
}

function TripHistory({ date, route, fare }: { date: string; route: string; fare: string }) {
  return <Card><View style={styles.routeSummary}><View style={styles.flex}><Text style={styles.strong}>{route}</Text><Text style={styles.muted}>{date} • Completed</Text></View><Text style={styles.fareInline}>{fare}</Text></View><Pressable onPress={() => router.push('/book')}><Text style={[textStyles.link, styles.historyAction]}>Book again</Text></Pressable></Card>;
}

function showNotice(title: string, message: string) {
  Alert.alert(title, message);
}

function safeBack(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

function formatDistance(distanceMeters: number) {
  return distanceMeters < 1000 ? `${distanceMeters} m` : `${(distanceMeters / 1000).toFixed(1)} km`;
}

function formatDuration(durationSeconds: number) {
  return `${Math.max(1, Math.round(durationSeconds / 60))} min`;
}

function formatFare(fare: number) {
  return `R${fare.toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tripStatusLabel(status: number) {
  if (status === 6) {
    return 'Completed';
  }
  if (status === 7) {
    return 'Cancelled';
  }
  return 'In progress';
}

function paymentMethodLabel(method: PaymentMethod) {
  return paymentOptions.find((option) => option.method === method)?.title ?? 'Cash';
}

function paymentIcon(method: PaymentMethod) {
  return paymentOptions.find((option) => option.method === method)?.icon ?? 'cash';
}

function readError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Unable to load map information.';
  }
  if (error.message.includes('Google Maps is not configured')) {
    return 'Google Maps API key is not configured on the backend.';
  }
  return 'Unable to load map information. Check the API connection and Google Maps configuration.';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, padding: 22, paddingTop: 58, gap: 16 },
  pageCompact: { paddingHorizontal: 14 },
  pageShort: { paddingTop: 42, gap: 12 },
  tabbedPage: { paddingBottom: 104 },
  onboarding: { flex: 1, padding: 24, paddingTop: 58, justifyContent: 'space-between' },
  onboardingShort: { paddingTop: 38, paddingBottom: 18 },
  center: { textAlign: 'center' },
  heroCircle: { alignSelf: 'center', width: 240, height: 240, borderRadius: 120, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  heroCircleCompact: { width: 198, height: 198, borderRadius: 99 },
  heroCircleShort: { width: 184, height: 184, borderRadius: 92 },
  pin: { position: 'absolute', right: 15, top: 25, width: 68, height: 68, borderRadius: 34, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#cbd2dc' },
  dotActive: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.blue },
  tapHint: { position: 'absolute', bottom: 35, alignSelf: 'center', color: colors.blue, fontWeight: '800' },
  auth: { flexGrow: 1, padding: 24, paddingTop: 100, gap: 14 },
  authShort: { paddingTop: 54 },
  authCopy: { marginTop: 55, marginBottom: 20, gap: 8 },
  phoneField: { minHeight: 62, borderWidth: 1, borderColor: colors.line, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  flag: { fontSize: 26 },
  country: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  separator: { width: 1, height: 34, backgroundColor: colors.line },
  textField: { minHeight: 58, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, color: colors.navy, fontSize: 16, backgroundColor: '#fff' },
  phoneInput: { flex: 1, minWidth: 0, minHeight: 50, fontSize: 18, color: colors.navy },
  authSwitch: { alignItems: 'center', paddingVertical: 4 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 10 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  strong: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  section: { gap: 10, marginTop: 24 },
  otpEntry: { position: 'relative' },
  otpRow: { flexDirection: 'row', gap: 7 },
  otpBox: { flex: 1, height: 54, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  otpActive: { borderColor: colors.blue, backgroundColor: '#eef4ff' },
  otpText: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  hiddenOtpInput: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottom: { marginTop: 'auto' },
  mapHeader: { paddingHorizontal: 18, paddingTop: 28, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  edgeCompact: { paddingHorizontal: 10 },
  mapLayer: { ...StyleSheet.absoluteFill },
  loadingOverlay: { ...StyleSheet.absoluteFill, zIndex: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.76)' },
  booking: { position: 'absolute', left: 14, right: 14, bottom: 76, backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 10 },
  bookingCompact: { left: 8, right: 8, bottom: 74, padding: 10, gap: 8 },
  bookingShort: { bottom: 68 },
  bookSheet: { position: 'absolute', left: 12, right: 12, bottom: 18, maxHeight: '72%', backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 10 },
  bookSheetCompact: { left: 8, right: 8, bottom: 10, padding: 10 },
  bookSheetShort: { maxHeight: '78%' },
  sheetContent: { gap: 10, paddingBottom: 6 },
  activeField: { borderRadius: 14, borderWidth: 2, borderColor: colors.blue },
  searchInput: { minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  searchText: { flex: 1, color: colors.navy, fontSize: 16 },
  suggestions: { maxHeight: 180, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  suggestionsShort: { maxHeight: 126 },
  suggestion: { minHeight: 62, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveCard: { gap: 10 },
  saveActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saveChip: { minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff' },
  saveChipText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  disabledChip: { opacity: 0.42 },
  paymentPlanCard: { gap: 10 },
  paymentPlanGrid: { flexDirection: 'row', gap: 8 },
  paymentPlanOption: { flex: 1, minHeight: 76, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 10, gap: 8, backgroundColor: '#fff' },
  paymentSummary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  routeSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fareInline: { color: colors.blue, fontSize: 20, fontWeight: '900' },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickRowCompact: { gap: 2 },
  quick: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabs: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  topControls: { paddingHorizontal: 18, paddingTop: 28, flexDirection: 'row', justifyContent: 'space-between' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 12 },
  sheetCompact: { padding: 12 },
  sheetShort: { maxHeight: '72%' },
  ride: { minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selected: { borderColor: colors.blue, backgroundColor: '#f2f7ff' },
  rideIcon: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#e8f0ff', alignItems: 'center', justifyContent: 'center' },
  searchRing: { position: 'absolute', top: '28%', alignSelf: 'center', width: 270, height: 270, borderRadius: 135, borderWidth: 2, borderColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  searchRingCompact: { width: 220, height: 220, borderRadius: 110 },
  searchRingShort: { top: '22%', width: 210, height: 210, borderRadius: 105 },
  searchCenter: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  matchStats: { position: 'absolute', left: 16, right: 16, bottom: 240, flexDirection: 'row' },
  matchStatsShort: { bottom: 218 },
  matchBottom: { position: 'absolute', left: 16, right: 16, bottom: 22, gap: 10 },
  matchBottomCompact: { left: 8, right: 8, bottom: 10 },
  driverCard: { position: 'absolute', top: 100, left: 16, right: 16 },
  driverCardCompact: { left: 8, right: 8 },
  driverCardShort: { top: 82 },
  metrics: { flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line, marginTop: 14, paddingTop: 14 },
  tripPanel: { position: 'absolute', left: 14, right: 14, bottom: 20, backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 12 },
  tripPanelCompact: { left: 8, right: 8, bottom: 10, padding: 10 },
  tripPanelShort: { maxHeight: '58%' },
  eta: { color: colors.blue, fontSize: 28, fontWeight: '900' },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.line },
  progressFill: { width: '58%', height: 8, borderRadius: 4, backgroundColor: colors.blue },
  fareCard: { alignItems: 'center', gap: 4 },
  fare: { color: colors.navy, fontSize: 44, fontWeight: '900' },
  payment: { minHeight: 72, borderRadius: 14, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tag: { borderRadius: 18, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 },
  tagSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  tagSelectedText: { color: '#fff' },
  comment: { minHeight: 110, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 14, textAlignVertical: 'top' },
  actionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 10 },
  actionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  savedPlaceRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 10 },
  savedPlaceMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  removePlaceButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2' },
  emptyState: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  profileAvatarSmall: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: '#fff', fontSize: 20, fontWeight: '900' },
  assignedDriver: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  driverTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ratingText: { color: '#fff', backgroundColor: colors.blue, borderRadius: 10, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, fontSize: 12, fontWeight: '900' },
  plateText: { color: colors.navy, fontSize: 13, fontWeight: '800' },
  historyAction: { marginTop: 14 },
});
