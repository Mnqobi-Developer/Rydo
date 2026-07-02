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
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useDriverAuth } from '../auth/AuthContext';
import { acceptTrip, cancelTrip, completeTrip, declineTrip, getDriverStatus, getDriverSummary, getDriverTrips, getRideTripId, markDriverArrived, setAvailability, startTrip, updateDriverLocation, type DriverSummaryStats, type RideRequest, type TripListItem } from '../rides/driverApi';
import { useDriverRide } from '../rides/DriverRideContext';
import { createRideConnection } from '../rides/driverRealtime';

const MAX_PHONE_WIDTH = 430;

export function DriverSplashScreen() {
  return <Pressable style={styles.flex} onPress={() => router.replace('/onboarding')}><Splash driver /><Text style={styles.tapHint}>Tap to continue</Text></Pressable>;
}

export function DriverOnboardingScreen() {
  const layout = useDriverLayout();
  return (
    <Screen>
      <View style={[styles.onboarding, layout.content]}>
        <Pressable onPress={() => router.replace('/login')}><Text style={textStyles.link}>Skip</Text></Pressable>
        <View style={styles.hero}>
          <Ionicons name="wallet" size={102} color={colors.blue} />
          <View style={styles.shield}><Ionicons name="shield-checkmark" size={38} color="#fff" /></View>
        </View>
        <Text style={[textStyles.heading, styles.center]}>More rides, <Text style={textStyles.link}>more earnings</Text></Text>
        <Text style={[textStyles.body, styles.center]}>Receive local ride requests and earn on your own terms.</Text>
        <PrimaryButton label="Get Started" icon="chevron-forward" onPress={() => router.push('/login')} />
      </View>
    </Screen>
  );
}

export function DriverLoginScreen() {
  return <DriverAuthScreen mode="signIn" />;
}

export function DriverSignUpScreen() {
  return <DriverAuthScreen mode="signUp" />;
}

function DriverAuthScreen({ mode }: { mode: 'signIn' | 'signUp' }) {
  const layout = useDriverLayout();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const phoneInputRef = useRef<TextInput>(null);
  const { requestOtp } = useDriverAuth();
  const signingUp = mode === 'signUp';

  const continueLogin = async () => {
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
      const normalizedEmail = email.trim().toLowerCase();
      const channel = signingUp ? 'email' : 'phone';
      await requestOtp(formattedPhone, signingUp ? normalizedEmail : undefined, channel);
      router.push({ pathname: '/otp', params: { phone: formattedPhone, mode, displayName: displayName.trim(), email: normalizedEmail, channel } });
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.auth, layout.content, layout.compact && styles.authCompact]} keyboardShouldPersistTaps="handled">
        <AppLogo driver />
        <View style={styles.copy}><Text style={[textStyles.heading, styles.center]}>{signingUp ? 'Create driver account' : 'Welcome back'}</Text><Text style={[textStyles.body, styles.center]}>{signingUp ? 'Sign up to start receiving Rydo ride requests' : 'Sign in to continue driving'}</Text></View>
        {signingUp ? (
          <>
            <TextInput value={displayName} onChangeText={setDisplayName} style={styles.textField} placeholder="Full name" textContentType="name" autoCapitalize="words" />
            <TextInput value={email} onChangeText={setEmail} style={styles.textField} placeholder="Email address" keyboardType="email-address" textContentType="emailAddress" autoCapitalize="none" />
          </>
        ) : null}
        <Pressable style={styles.phoneField} onPress={() => phoneInputRef.current?.focus()}><Text style={styles.flag}>🇿🇦</Text><Text style={styles.country}>+27</Text><View style={styles.separator} /><TextInput ref={phoneInputRef} value={phoneNumber} onChangeText={setPhoneNumber} style={styles.input} placeholder="72 123 4567" keyboardType="phone-pad" /></Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label={submitting ? 'Sending code...' : signingUp ? 'Create Account' : 'Sign In'} disabled={submitting} onPress={() => void continueLogin()} />
        <Pressable style={styles.authSwitch} onPress={() => router.replace(signingUp ? '/login' : '/signup')}>
          <Text style={styles.muted}>{signingUp ? 'Already have a driver account?' : 'New to Rydo Driver?'} <Text style={textStyles.link}>{signingUp ? 'Sign in' : 'Sign up'}</Text></Text>
        </Pressable>
        <SecondaryButton label="Continue with Google" onPress={() => showNotice('Google sign-in', 'Google authentication will be enabled during the authentication integration step.')} />
        <SecondaryButton label="Continue with Apple" onPress={() => showNotice('Apple sign-in', 'Apple authentication will be enabled during the authentication integration step.')} />
      </ScrollView>
    </Screen>
  );
}

export function DriverOtpScreen() {
  const layout = useDriverLayout();
  const params = useLocalSearchParams<{ phone?: string; mode?: string; displayName?: string; email?: string; channel?: string }>();
  const phoneNumber = typeof params.phone === 'string' ? params.phone : '';
  const signingUp = params.mode === 'signUp';
  const displayName = typeof params.displayName === 'string' ? params.displayName : undefined;
  const email = typeof params.email === 'string' ? params.email : undefined;
  const channel = params.channel === 'email' ? 'email' : 'phone';
  const verificationTarget = channel === 'email' ? email : phoneNumber;
  const verificationLabel = channel === 'email' ? 'email' : 'phone';
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const otpInputRef = useRef<TextInput>(null);
  const { requestOtp, verifyOtp } = useDriverAuth();

  const verifyCode = async () => {
    if (!phoneNumber) {
      router.replace('/login');
      return;
    }

    if (code.length !== 6) {
      setError(`Enter the 6-digit code sent to your ${verificationLabel}.`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await verifyOtp(phoneNumber, code, signingUp ? { displayName, email } : undefined, channel);
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
      await requestOtp(phoneNumber, email, channel);
      Alert.alert('Code sent', 'A new verification code has been requested.');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    }
  };

  return (
    <Screen>
      <View style={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <IconButton icon="chevron-back" onPress={() => safeBack('/login')} />
        <View style={styles.section}>
          <Text style={textStyles.heading}>{channel === 'email' ? 'Verify Your Email' : 'Verify Your Number'}</Text>
          <Text style={textStyles.body}>We've sent a 6-digit code to <Text style={textStyles.link}>{verificationTarget || `your ${verificationLabel}`}</Text> to {signingUp ? 'create your driver account' : 'sign you in'}.</Text>
        </View>
        <Pressable style={styles.otpEntry} onPress={() => otpInputRef.current?.focus()}>
          <View style={styles.otpRow}>
            {Array.from({ length: 6 }).map((_, index) => <View key={index} style={[styles.otpBox, index === code.length && styles.otpActive]}><Text style={styles.otpText}>{code[index] ?? ''}</Text></View>)}
          </View>
          <TextInput ref={otpInputRef} value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} autoFocus textContentType="oneTimeCode" style={styles.hiddenOtpInput} />
        </Pressable>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable onPress={() => void resendCode()}><Text style={[textStyles.link, styles.center]}>Resend code</Text></Pressable>
        <Card style={styles.infoCard}><Ionicons name="shield-checkmark" size={36} color={colors.blue} /><View style={styles.flex}><Text style={styles.strong}>Secure driver verification</Text><Text style={styles.muted}>Your driver account is protected.</Text></View></Card>
        <View style={styles.bottom}><PrimaryButton label={submitting ? 'Verifying...' : 'Verify and Continue'} disabled={submitting} onPress={() => void verifyCode()} /></View>
      </View>
    </Screen>
  );
}

export function DriverHomeScreen() {
  const layout = useDriverLayout();
  const [online, setOnline] = useState(false);
  const [summary, setSummary] = useState<DriverSummaryStats>();
  const { loading, session } = useDriverAuth();
  const { setPendingRide } = useDriverRide();
  const [connectionStatus, setConnectionStatus] = useState('Go online to start receiving ride requests.');

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [loading, session]);

  useEffect(() => {
    if (!session?.driverProfileId) {
      return;
    }

    let mounted = true;
    Promise.all([
      getDriverStatus(session.driverProfileId, session.accessToken),
      getDriverSummary(session.driverProfileId, session.accessToken),
    ])
      .then(([status, nextSummary]) => {
        if (!mounted) {
          return;
        }
        setOnline(status.isOnline);
        setSummary(nextSummary);
        setConnectionStatus(status.isOnline ? 'Waiting for nearby ride requests.' : 'Go online to start receiving ride requests.');
      })
      .catch((requestError) => {
        if (mounted) {
          setConnectionStatus(getRequestErrorMessage(requestError));
        }
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    if (!online || !session?.driverProfileId) {
      return;
    }

    let disposed = false;
    const connection = createRideConnection(session.accessToken);

    connection.on('ride.requested', (request: RideRequest) => {
      setPendingRide(request);
      router.push('/ride-request');
    });

    connection
      .start()
      .then(async () => {
        await connection.invoke('JoinDriverQueue', session.driverProfileId);
        if (!disposed) {
          setConnectionStatus('Waiting for nearby ride requests.');
        }
      })
      .catch(() => {
        if (!disposed) {
          setConnectionStatus('Realtime connection failed. Toggle online to retry.');
        }
      });

    return () => {
      disposed = true;
      void connection.stop();
    };
  }, [online, session, setPendingRide]);

  const toggleOnline = async () => {
    if (!session?.driverProfileId) {
      Alert.alert('Driver profile missing', 'Sign out and sign back in to create your driver profile.');
      return;
    }

    const nextOnline = !online;
    setOnline(nextOnline);
    setConnectionStatus(nextOnline ? 'Connecting to Rydo dispatch...' : 'Go online to start receiving ride requests.');

    try {
      await setAvailability(session.driverProfileId, nextOnline, session.accessToken);
      if (nextOnline) {
        await updateDriverLocation(session.driverProfileId, session.accessToken);
      }
    } catch (error) {
      setOnline(!nextOnline);
      setConnectionStatus(getRequestErrorMessage(error));
    }
  };

  return (
    <Screen>
      {loading ? <View style={styles.loadingOverlay}><ActivityIndicator color={colors.blue} size="large" /></View> : null}
      <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <Header subtitle="Good morning," title={session?.displayName ?? 'Driver'} action={<IconButton icon="notifications" onPress={() => router.push('/notifications')} />} />
        <Text style={styles.rating}>? {(summary?.ratingAverage ?? 0).toFixed(1)} Verified Driver</Text>
        <Card>
          <Text style={styles.muted}>Today's Earnings</Text>
          <Text style={styles.money}>{formatFare(summary?.todayEarnings ?? 0)}</Text>
          <View style={styles.metrics}><Metric value={`${summary?.todayTrips ?? 0}`} label="Trips" /><Metric value={online ? 'Online' : 'Offline'} label="Status" /></View>
        </Card>
        <Card>
          <View style={styles.row}><Text style={styles.strong}>Performance</Text><Pressable onPress={() => router.push('/earnings')}><Text style={textStyles.link}>View all</Text></Pressable></View>
          <View style={styles.metrics}><Metric value={`${summary?.weekTrips ?? 0}`} label="Week trips" /><Metric value={`${(summary?.ratingAverage ?? 0).toFixed(1)} ?`} label="Rating" /><Metric value={formatFare(summary?.weekEarnings ?? 0)} label="Week earned" /></View>
        </Card>
        <Card style={[styles.onlineCard, online && styles.online]}>
          <View style={styles.flex}><Text style={[styles.strong, online && styles.success]}>{online ? "You're online" : "You're offline"}</Text><Text style={styles.muted}>{connectionStatus}</Text></View>
          <Pressable onPress={() => void toggleOnline()} style={styles.power}><Ionicons name="power" size={34} color={online ? colors.success : colors.muted} /></Pressable>
        </Card>
      </ScrollView>
      <DriverTabs active="Home" />
    </Screen>
  );
}

export function RideRequestScreen() {
  const layout = useDriverLayout();
  const { session } = useDriverAuth();
  const { pendingRide, setPendingRide, setActiveTrip } = useDriverRide();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const acceptRequest = async () => {
    if (!session?.driverProfileId || !pendingRide) {
      router.replace('/home');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const trip = await acceptTrip(getRideTripId(pendingRide), session.driverProfileId, session.accessToken);
      setActiveTrip(trip);
      setPendingRide(undefined);
      router.replace('/navigation');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const declineRequest = async () => {
    if (session && pendingRide) {
      await declineTrip(getRideTripId(pendingRide), session.accessToken).catch(() => undefined);
    }
    setPendingRide(undefined);
    router.replace('/home');
  };

  if (!pendingRide) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
          <Header title="No active request" subtitle="Go online to receive ride requests" />
          <PrimaryButton label="Back to Home" onPress={() => router.replace('/home')} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen map>
      <MapCanvas dark />
      <View style={[styles.request, layout.floatingPanel, layout.compact && styles.requestCompact]}>
        <View style={styles.row}><Text style={styles.strong}>New ride request</Text><Text style={styles.timer}>Live</Text></View>
        <LocationField label="Pickup" value={pendingRide.pickupAddress} />
        <LocationField destination label="Destination" value={pendingRide.destinationAddress} />
        <View style={styles.row}><View><Text style={styles.muted}>Estimated fare</Text><Text style={styles.fare}>{formatFare(pendingRide.estimatedFare)}</Text></View><Text style={textStyles.link}>Live request</Text></View>
        <View style={styles.metrics}><Metric value="4.8 ★" label="User rating" /><Metric value="15 min" label="Estimated trip" /></View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={[styles.actions, layout.compact && styles.actionsCompact]}><SecondaryButton label="Decline" onPress={() => void declineRequest()} /><PrimaryButton label={submitting ? 'Accepting...' : 'Accept'} disabled={submitting} onPress={() => void acceptRequest()} /></View>
      </View>
    </Screen>
  );
}

export function NavigationScreen() {
  const layout = useDriverLayout();
  const { session } = useDriverAuth();
  const { activeTrip, setActiveTrip, clearRide } = useDriverRide();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const tripStage = activeTrip?.status === 5 ? 'trip' : activeTrip?.status === 4 ? 'ready' : 'arriving';

  useEffect(() => {
    if (!activeTrip) {
      router.replace('/home');
    }
  }, [activeTrip]);

  const advanceTrip = async () => {
    if (!session || !activeTrip) {
      router.replace('/home');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const nextTrip = tripStage === 'arriving'
        ? await markDriverArrived(activeTrip.tripId, session.accessToken)
        : tripStage === 'ready'
          ? await startTrip(activeTrip.tripId, session.accessToken)
          : await completeTrip(activeTrip.tripId, session.accessToken);
      setActiveTrip(nextTrip);
      if (nextTrip.status === 6) {
        Alert.alert('Trip completed', 'The passenger trip has been completed.', [{ text: 'Done', onPress: () => { clearRide(); router.replace('/home'); } }]);
      }
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelActiveTrip = async () => {
    if (!session || !activeTrip) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await cancelTrip(activeTrip.tripId, session.accessToken);
      clearRide();
      router.replace('/home');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeTrip) {
    return null;
  }

  return (
    <Screen map>
      <MapCanvas dark route />
      <View style={[styles.navHeader, layout.headerPanel]}><IconButton icon="chevron-down" onPress={() => router.replace('/home')} /><Card style={styles.turn}><Ionicons name="arrow-up" size={34} color={colors.blue} /><View style={styles.flex}><Text style={styles.strong}>Continue on Main Road</Text><Text style={styles.muted}>1.2 km</Text></View></Card></View>
      <View style={[styles.navigationPanel, layout.floatingPanel]}>
        <Text style={textStyles.subheading}>{tripStage === 'trip' ? `Driving to ${activeTrip.destinationAddress}` : `Pickup: ${activeTrip.pickupAddress}`}</Text>
        <Text style={styles.eta}>{tripStage === 'arriving' ? 'Arriving in 4 min' : tripStage === 'ready' ? 'Passenger notified' : '21 min remaining'}</Text>
        <Text style={styles.muted}>{formatFare(activeTrip.estimatedFare)} estimated fare</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={[styles.actions, layout.compact && styles.actionsCompact]}><SecondaryButton label="Cancel Trip" danger onPress={() => void cancelActiveTrip()} /><PrimaryButton label={submitting ? 'Updating...' : tripStage === 'arriving' ? 'I Have Arrived' : tripStage === 'ready' ? 'Start Trip' : 'Complete Trip'} disabled={submitting} onPress={() => void advanceTrip()} /></View>
      </View>
    </Screen>
  );
}

export function EarningsScreen() {
  const layout = useDriverLayout();
  const { session } = useDriverAuth();
  const [summary, setSummary] = useState<DriverSummaryStats>();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.driverProfileId) {
      return;
    }

    getDriverSummary(session.driverProfileId, session.accessToken)
      .then(setSummary)
      .catch((requestError) => setError(getRequestErrorMessage(requestError)));
  }, [session]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <Header title="Earnings" subtitle="This week" />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Card style={styles.earningsHero}><Text style={styles.muted}>Week earnings</Text><Text style={styles.total}>{formatFare(summary?.weekEarnings ?? 0)}</Text><Text style={styles.success}>{summary?.weekTrips ?? 0} completed trips</Text></Card>
        <Card><View style={styles.metrics}><Metric value={`${summary?.todayTrips ?? 0}`} label="Today trips" /><Metric value={formatFare(summary?.todayEarnings ?? 0)} label="Today" /><Metric value={`${(summary?.ratingAverage ?? 0).toFixed(1)} ★`} label="Rating" /></View></Card>
      </ScrollView>
      <DriverTabs active="Earnings" />
    </Screen>
  );
}

export function DriverTripsScreen() {
  const layout = useDriverLayout();
  const { session } = useDriverAuth();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.driverProfileId) {
      return;
    }

    let mounted = true;
    setLoadingTrips(true);
    getDriverTrips(session.driverProfileId, session.accessToken)
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
      <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <Header title="Trips" subtitle="Completed rides" />
        {loadingTrips ? <ActivityIndicator color={colors.blue} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!loadingTrips && trips.length === 0 ? <DriverEmptyState icon="receipt" title="No trips yet" detail="Accepted and completed rides will appear here." /> : null}
        {trips.map((trip) => <DriverTripItem key={trip.tripId} trip={trip} />)}
      </ScrollView>
      <DriverTabs active="Trips" />
    </Screen>
  );
}

export function DriverWalletScreen() {
  const layout = useDriverLayout();
  const { session } = useDriverAuth();
  const [summary, setSummary] = useState<DriverSummaryStats>();

  useEffect(() => {
    if (!session?.driverProfileId) {
      return;
    }

    getDriverSummary(session.driverProfileId, session.accessToken).then(setSummary).catch(() => undefined);
  }, [session]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <Header title="Wallet" subtitle="Driver payouts" />
        <Card style={styles.earningsHero}><Text style={styles.muted}>Available balance</Text><Text style={styles.total}>{formatFare(summary?.weekEarnings ?? 0)}</Text><Text style={styles.success}>{summary?.weekTrips ?? 0} completed trips this week</Text></Card>
        <DriverEmptyState icon="wallet" title="Payouts not connected yet" detail="Bank account and payout history will appear here after payout onboarding is added." />
      </ScrollView>
      <DriverTabs active="Wallet" />
    </Screen>
  );
}

export function DriverProfileScreen() {
  const layout = useDriverLayout();
  const { session, signOut } = useDriverAuth();
  const displayName = session?.displayName ?? 'Rydo Driver';
  const displayEmail = session?.email;
  const displayPhone = session?.phoneNumber ?? '+27 72 123 4567';

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <Header title="Profile" subtitle="Driver account" action={<IconButton icon="notifications" onPress={() => router.push('/notifications')} />} />
        <Card style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitials}>{getInitials(displayName)}</Text></View><View style={styles.flex}><Text style={textStyles.subheading}>{displayName}</Text><Text style={styles.muted}>{displayPhone}</Text>{displayEmail ? <Text style={styles.muted}>{displayEmail}</Text> : null}<Text style={styles.muted}>Driver account</Text></View></Card>
        <Card><DriverAction icon="car-sport" title="Vehicle" detail="Vehicle profile will appear after backend onboarding." onPress={() => showNotice('Vehicle details', 'Vehicle management will be connected to the driver backend profile.')} /><DriverAction icon="document-text" title="Documents" detail="Licence and vehicle document management" onPress={() => showNotice('Documents', 'Document verification will be connected to the driver backend profile.')} /><DriverAction icon="help-circle" title="Driver support" detail="Help and trip disputes" onPress={() => void Linking.openURL('mailto:drivers@rydo.co.za')} /></Card>
        <SecondaryButton label="Sign Out" danger onPress={() => void handleSignOut()} />
      </ScrollView>
      <DriverTabs active="Profile" />
    </Screen>
  );
}

export function DriverNotificationsScreen() {
  const layout = useDriverLayout();
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.page, layout.content, layout.compact && styles.pageCompact]}>
        <IconButton icon="chevron-back" onPress={() => safeBack('/home')} />
        <Header title="Notifications" subtitle="Driver updates" />
        <DriverEmptyState icon="notifications" title="No notifications yet" detail="Ride, payout, rating, and document alerts will appear here." />
      </ScrollView>
    </Screen>
  );
}

function DriverTabs({ active }: { active: string }) {
  const routes: Record<string, '/home' | '/earnings' | '/trips' | '/wallet' | '/profile'> = { Home: '/home', Earnings: '/earnings', Trips: '/trips', Wallet: '/wallet', Profile: '/profile' };
  return <BottomTabs active={active} onPress={(label) => router.replace(routes[label])} items={[{ label: 'Home', icon: 'home' }, { label: 'Earnings', icon: 'stats-chart' }, { label: 'Trips', icon: 'receipt' }, { label: 'Wallet', icon: 'wallet' }, { label: 'Profile', icon: 'person' }]} />;
}

function useDriverLayout() {
  const { width, height } = useWindowDimensions();
  const compact = width < 380;
  const panelWidth = Math.min(width - 24, MAX_PHONE_WIDTH);
  const panelInset = Math.max(12, (width - panelWidth) / 2);
  const contentPadding = compact ? 14 : 20;

  return {
    compact,
    content: {
      width: '100%' as const,
      maxWidth: MAX_PHONE_WIDTH,
      alignSelf: 'center' as const,
      paddingHorizontal: contentPadding,
    },
    floatingPanel: {
      left: panelInset,
      right: panelInset,
      bottom: height < 700 ? 14 : 24,
    },
    headerPanel: {
      width: panelWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: 0,
      paddingTop: height < 700 ? 18 : 28,
    },
  };
}

function DriverAction({ icon, title, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; onPress?: () => void }) {
  return <Pressable disabled={!onPress} onPress={onPress} style={styles.actionRow}><View style={styles.actionIcon}><Ionicons name={icon} size={22} color={colors.blue} /></View><View style={styles.flex}><Text style={styles.strong}>{title}</Text><Text style={styles.muted}>{detail}</Text></View>{onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />}</Pressable>;
}

function DriverTripItem({ trip }: { trip: TripListItem }) {
  return <Card><View style={styles.row}><View style={styles.flex}><Text style={styles.strong}>{trip.pickupAddress} to {trip.destinationAddress}</Text><Text style={styles.muted}>{formatDate(trip.completedAtUtc ?? trip.requestedAtUtc)} • {tripStatusLabel(trip.status)}</Text></View><Text style={styles.moneySmall}>{formatFare(trip.fare)}</Text></View></Card>;
}

function DriverEmptyState({ icon, title, detail }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }) {
  return <Card style={styles.emptyState}><Ionicons name={icon} size={32} color={colors.blue} /><Text style={styles.strong}>{title}</Text><Text style={[styles.muted, styles.center]}>{detail}</Text></Card>;
}

function DriverTrip({ date, route, amount }: { date: string; route: string; amount: string }) {
  return <Card><View style={styles.row}><View style={styles.flex}><Text style={styles.strong}>{route}</Text><Text style={styles.muted}>{date} • Completed</Text></View><Text style={styles.moneySmall}>{amount}</Text></View></Card>;
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
    .join('') || 'RD';
}

function formatFare(value: number) {
  return `R${value.toFixed(2)}`;
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { flexGrow: 1, padding: 20, paddingTop: 58, paddingBottom: 100, gap: 16 },
  pageCompact: { paddingTop: 42, paddingBottom: 92, gap: 12 },
  onboarding: { flex: 1, padding: 24, paddingTop: 58, justifyContent: 'space-between' },
  center: { textAlign: 'center' },
  hero: { alignSelf: 'center', width: 240, height: 240, borderRadius: 120, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  shield: { position: 'absolute', right: 16, top: 28, width: 68, height: 68, borderRadius: 34, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  tapHint: { position: 'absolute', bottom: 35, alignSelf: 'center', color: colors.blue, fontWeight: '800' },
  auth: { flexGrow: 1, padding: 24, paddingTop: 100, gap: 14 },
  authCompact: { paddingTop: 58, gap: 12 },
  copy: { marginTop: 58, marginBottom: 20, gap: 8 },
  phoneField: { minHeight: 62, borderWidth: 1, borderColor: colors.line, borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  flag: { fontSize: 26 },
  country: { color: colors.navy, fontSize: 18, fontWeight: '800' },
  separator: { width: 1, height: 34, backgroundColor: colors.line },
  textField: { minHeight: 58, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, color: colors.navy, fontSize: 16, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 50, fontSize: 18, color: colors.navy },
  authSwitch: { alignItems: 'center', paddingVertical: 4 },
  errorText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  section: { gap: 10, marginTop: 24 },
  otpEntry: { position: 'relative' },
  otpRow: { flexDirection: 'row', gap: 7 },
  otpBox: { flex: 1, height: 54, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  otpActive: { borderColor: colors.blue, backgroundColor: '#eef4ff' },
  otpText: { color: colors.navy, fontSize: 24, fontWeight: '900' },
  hiddenOtpInput: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottom: { marginTop: 'auto' },
  loadingOverlay: { ...StyleSheet.absoluteFill, zIndex: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.76)' },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  strong: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  rating: { color: colors.amber, fontWeight: '900', marginTop: -8 },
  money: { color: colors.success, fontSize: 30, fontWeight: '900', marginTop: 6 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderColor: colors.line, paddingTop: 14, marginTop: 14, rowGap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onlineCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f2f5f9' },
  online: { backgroundColor: '#edfff4', borderColor: '#c6f1d6' },
  success: { color: colors.success, fontWeight: '900' },
  power: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  request: { position: 'absolute', left: 16, right: 16, bottom: 24, borderRadius: 18, backgroundColor: '#fff', padding: 16, gap: 10 },
  requestCompact: { padding: 12, gap: 8 },
  timer: { backgroundColor: colors.blue, color: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, overflow: 'hidden', fontWeight: '900' },
  fare: { color: colors.navy, fontSize: 26, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 10 },
  actionsCompact: { flexDirection: 'column-reverse' },
  navHeader: { paddingHorizontal: 16, paddingTop: 28, flexDirection: 'row', gap: 10 },
  turn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  navigationPanel: { position: 'absolute', left: 16, right: 16, bottom: 24, backgroundColor: '#fff', borderRadius: 18, padding: 16, gap: 12 },
  eta: { color: colors.blue, fontSize: 28, fontWeight: '900' },
  earningsHero: { alignItems: 'center', gap: 5, paddingVertical: 28 },
  total: { color: colors.navy, fontSize: 38, fontWeight: '900' },
  chart: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 20 },
  bar: { width: 24, borderRadius: 5, backgroundColor: colors.blue },
  emptyState: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 10 },
  actionIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#eaf2ff', alignItems: 'center', justifyContent: 'center' },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  profileInitials: { color: '#fff', fontSize: 20, fontWeight: '900' },
  moneySmall: { color: colors.success, fontSize: 18, fontWeight: '900' },
});
