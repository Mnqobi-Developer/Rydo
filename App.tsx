import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;
type PassengerScreen =
  | 'Splash'
  | 'Onboarding'
  | 'Login'
  | 'OTP'
  | 'Home'
  | 'Ride'
  | 'Matching'
  | 'Arriving'
  | 'Trip'
  | 'Payment'
  | 'Rating';
type DriverScreen = 'Driver Splash' | 'Driver Onboarding' | 'Driver Login' | 'Go Online' | 'Ride Request';
type Mode = 'Passenger' | 'Driver';

const blue = '#0757d8';
const deepBlue = '#003caa';
const ink = '#081126';
const muted = '#65708a';
const lightLine = '#e5eaf4';
const passengerScreens: PassengerScreen[] = [
  'Splash',
  'Onboarding',
  'Login',
  'OTP',
  'Home',
  'Ride',
  'Matching',
  'Arriving',
  'Trip',
  'Payment',
  'Rating',
];
const driverScreens: DriverScreen[] = ['Driver Splash', 'Driver Onboarding', 'Driver Login', 'Go Online', 'Ride Request'];

export default function App() {
  const [mode, setMode] = useState<Mode>('Passenger');
  const [passengerScreen, setPassengerScreen] = useState<PassengerScreen>('Home');
  const [driverScreen, setDriverScreen] = useState<DriverScreen>('Go Online');
  const { width, height } = useWindowDimensions();
  const activeScreens = mode === 'Passenger' ? passengerScreens : driverScreens;
  const activeScreen = mode === 'Passenger' ? passengerScreen : driverScreen;
  const availableHeight = Math.max(520, height - 212);
  const phoneScale = Math.min(1, (width * 0.94) / 390, availableHeight / 812);

  const content = useMemo(() => {
    if (mode === 'Driver') {
      switch (driverScreen) {
        case 'Driver Splash':
          return <SplashScreen driver />;
        case 'Driver Onboarding':
          return <DriverOnboarding />;
        case 'Driver Login':
          return <LoginScreen driver />;
        case 'Ride Request':
          return <RideRequestScreen />;
        default:
          return <GoOnlineScreen />;
      }
    }

    switch (passengerScreen) {
      case 'Splash':
        return <SplashScreen />;
      case 'Onboarding':
        return <PassengerOnboarding />;
      case 'Login':
        return <LoginScreen />;
      case 'OTP':
        return <OtpScreen />;
      case 'Ride':
        return <RideSelectionScreen />;
      case 'Matching':
        return <DriverMatchingScreen />;
      case 'Arriving':
        return <DriverArrivingScreen />;
      case 'Trip':
        return <ActiveTripScreen />;
      case 'Payment':
        return <PaymentScreen />;
      case 'Rating':
        return <RatingScreen />;
      default:
        return <HomeScreen />;
    }
  }, [driverScreen, mode, passengerScreen]);

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.shellHeader}>
        <View>
          <Text style={styles.eyebrow}>RYDO MVP Prototype</Text>
          <Text style={styles.shellTitle}>Local ride-hailing experience</Text>
        </View>
        <View style={styles.modeSwitch}>
          {(['Passenger', 'Driver'] as Mode[]).map((item) => (
            <Pressable
              key={item}
              onPress={() => setMode(item)}
              style={[styles.modePill, mode === item && styles.modePillActive]}
            >
              <Text style={[styles.modePillText, mode === item && styles.modePillTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroller}
        contentContainerStyle={styles.screenTabs}
      >
        {activeScreens.map((screen) => (
          <Pressable
            key={screen}
            onPress={() => (mode === 'Passenger'
              ? setPassengerScreen(screen as PassengerScreen)
              : setDriverScreen(screen as DriverScreen))}
            style={[styles.screenTab, activeScreen === screen && styles.screenTabActive]}
          >
            <Text style={[styles.screenTabText, activeScreen === screen && styles.screenTabTextActive]}>{screen}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.stage}>
        <View style={{ width: 390 * phoneScale, height: 812 * phoneScale }}>
          <View
            style={[
              styles.phoneFrame,
              {
                transform: [
                  { translateX: -(390 * (1 - phoneScale)) / 2 },
                  { translateY: -(812 * (1 - phoneScale)) / 2 },
                  { scale: phoneScale },
                ],
              },
            ]}
          >
            <View style={styles.notch} />
            {content}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function SplashScreen({ driver = false }: { driver?: boolean }) {
  return (
    <LinearGradient colors={['#005fec', '#0045bd', '#002c87']} style={styles.screen}>
      <CityBackground />
      <View style={styles.splashCenter}>
        <Text style={styles.logo}>RYDO</Text>
        <Text style={styles.logoTag}>{driver ? 'D R I V E R' : 'T A K I N G   Y O U   P L A C E S'}</Text>
        {driver && <Text style={styles.driverTag}>Drive. Earn. Grow.</Text>}
      </View>
      <View style={styles.whiteWave} />
      <View style={styles.loader} />
    </LinearGradient>
  );
}

function PassengerOnboarding() {
  return (
    <OnboardingFrame
      title="Ride anywhere"
      accent="locally"
      body="Request a ride and get picked up in minutes, wherever you are."
      icon="car-sport"
      cta="Next"
      active={0}
    />
  );
}

function DriverOnboarding() {
  return (
    <OnboardingFrame
      title="More rides,"
      accent="more earnings"
      body="Receive local ride requests and earn on your own terms."
      icon="wallet"
      cta="Get Started"
      active={1}
      driver
    />
  );
}

function OnboardingFrame({
  title,
  accent,
  body,
  icon,
  cta,
  active,
  driver = false,
}: {
  title: string;
  accent: string;
  body: string;
  icon: IconName;
  cta: string;
  active: number;
  driver?: boolean;
}) {
  return (
    <View style={[styles.screen, styles.whiteScreen]}>
      <Text style={styles.skip}>Skip</Text>
      <View style={styles.illustration}>
        <CityMini />
        <View style={styles.illustrationCircle}>
          <Ionicons name={icon} size={84} color={blue} />
        </View>
        <View style={styles.badgeFloat}>
          <Ionicons name={driver ? 'shield-checkmark' : 'location'} size={36} color="#fff" />
        </View>
      </View>
      <View style={styles.onboardingCopy}>
        <Text style={styles.bigTitle}>
          {title} <Text style={styles.blueText}>{accent}</Text>
        </Text>
        <Text style={styles.bodyText}>{body}</Text>
      </View>
      <Dots active={active} />
      <PrimaryButton label={cta} icon="chevron-forward" />
    </View>
  );
}

function LoginScreen({ driver = false }: { driver?: boolean }) {
  return (
    <View style={[styles.screen, styles.whiteScreen, styles.loginScreen]}>
      <View style={styles.logoBlock}>
        <Text style={styles.logoBlue}>RYDO</Text>
        <Text style={styles.logoBlueTag}>{driver ? 'D R I V E R' : 'T A K I N G   Y O U   P L A C E S'}</Text>
      </View>
      <Text style={styles.loginTitle}>{driver ? 'Welcome back' : 'Welcome to Rydo'}</Text>
      <Text style={styles.bodyText}>Enter your mobile number to get started</Text>
      <View style={styles.phoneInput}>
        <Text style={styles.flag}>🇿🇦</Text>
        <Text style={styles.country}>+27</Text>
        <Ionicons name="chevron-down" size={18} color={ink} />
        <View style={styles.inputDivider} />
        <TextInput value="72 123 4567" editable={false} style={styles.input} />
      </View>
      <PrimaryButton label="Continue" />
      <DividerLabel label="or continue with" />
      <SocialButton icon="logo-google" label="Continue with Google" />
      <SocialButton icon="logo-apple" label="Continue with Apple" dark />
      <Text style={styles.terms}>By continuing, you agree to our <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text></Text>
    </View>
  );
}

function OtpScreen() {
  return (
    <View style={[styles.screen, styles.whiteScreen, styles.otpScreen]}>
      <Ionicons name="chevron-back" size={28} color={ink} />
      <Text style={styles.loginTitle}>Verify Your Number</Text>
      <Text style={styles.otpSub}>We've sent a 6-digit code to{'\n'}<Text style={styles.link}>+27 72 123 4567</Text></Text>
      <View style={styles.otpRow}>
        {'527193'.split('').map((num, index) => (
          <View key={index} style={[styles.otpBox, index === 5 && styles.otpActive]}>
            <Text style={styles.otpNum}>{num}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.resend}>Resend code in 00:28</Text>
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}><Ionicons name="shield-checkmark" size={28} color={blue} /></View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoTitle}>Secure Verification</Text>
          <Text style={styles.smallText}>Your number is safe with us. We'll never share it.</Text>
        </View>
      </View>
      <View style={styles.keypad}>
        {'123456789'.split('').map((num) => <Key key={num} n={num} />)}
        <View />
        <Key n="0" />
        <Ionicons name="backspace-outline" size={28} color={ink} />
      </View>
    </View>
  );
}

function HomeScreen() {
  return (
    <View style={styles.screen}>
      <MapCanvas variant="light" />
      <View style={styles.mapTop}>
        <IconButton icon="menu" />
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.mapTitle}>Where are{'\n'}you going?</Text>
        </View>
        <IconButton icon="notifications" alert />
      </View>
      <View style={styles.floatRail}>
        <FloatingAction icon="wallet" label="Wallet" />
        <FloatingAction icon="pricetag" label="Promo" />
        <FloatingAction icon="medkit" label="SOS" danger />
      </View>
      <View style={styles.bookingCard}>
        <LocationInput icon="radio-button-on" label="Choose a pickup location" value="123 Main Road, Sandton" />
        <LocationInput icon="location" value="Where are you going?" muted />
        <View style={styles.quickRow}>
          <QuickAction icon="home" title="Home" sub="12 min" />
          <QuickAction icon="briefcase" title="Work" sub="25 min" />
          <QuickAction icon="star" title="Favorites" sub="3 places" />
        </View>
        <PrimaryButton label="Choose Ride" />
      </View>
      <BottomNav active="Home" />
    </View>
  );
}

function RideSelectionScreen() {
  const rides = [
    ['Rydo Go', 'Affordable standard rides', 'R58.00', 'car-sport'],
    ['Rydo XL', 'Larger vehicles for groups', 'R86.00', 'bus'],
    ['Rydo Comfort', 'Premium rides with top drivers', 'R112.00', 'sparkles'],
    ['Rydo Local', 'Taxi and minibus integration later', 'Soon', 'people'],
  ] as const;

  return (
    <View style={styles.screen}>
      <MapCanvas variant="light" route />
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" />
        <Text style={styles.topTitle}>Choose your ride</Text>
        <IconButton icon="options" />
      </View>
      <View style={styles.rideSheet}>
        <Text style={styles.sheetTitle}>OR Tambo Airport</Text>
        <Text style={styles.bodyText}>15.4 km away • Pickup in Sandton</Text>
        {rides.map(([name, desc, price, icon], index) => (
          <Pressable key={name} style={[styles.rideOption, index === 0 && styles.rideOptionActive]}>
            <View style={styles.rideIcon}><Ionicons name={icon} size={30} color={blue} /></View>
            <View style={styles.rideDetails}>
              <Text style={styles.rideName}>{name}</Text>
              <Text style={styles.smallText}>{desc}</Text>
            </View>
            <Text style={styles.price}>{price}</Text>
          </Pressable>
        ))}
        <PrimaryButton label="Confirm Rydo Go" />
      </View>
    </View>
  );
}

function DriverMatchingScreen() {
  return (
    <View style={styles.screen}>
      <MapCanvas variant="light" search />
      <View style={styles.topBar}>
        <IconButton icon="chevron-back" />
      </View>
      <View style={styles.matchHeader}>
        <Text style={styles.mapTitle}>Finding you a driver...</Text>
        <Text style={styles.bodyText}>Searching nearby drivers</Text>
      </View>
      <View style={styles.searchBubble}>
        <Text style={styles.smallStrong}>Looking for available drivers near you</Text>
        <View style={styles.loaderBlue} />
      </View>
      <View style={styles.matchStats}>
        <Metric value="02:15" label="Est. wait time" />
        <Metric value="6" label="Drivers nearby" />
        <Metric value="1.2 km" label="Search radius" />
      </View>
      <View style={styles.matchBottom}>
        <View style={styles.infoCard}>
          <View style={styles.shield}><Ionicons name="shield-checkmark" size={28} color="#fff" /></View>
          <View style={styles.infoCopy}>
            <Text style={styles.infoTitle}>We're finding the best driver for you</Text>
            <Text style={styles.smallText}>This usually takes less than a minute.</Text>
          </View>
        </View>
        <Pressable style={styles.cancelButton}><Text style={styles.cancelText}>Cancel Ride</Text></Pressable>
      </View>
    </View>
  );
}

function DriverArrivingScreen() {
  return (
    <View style={styles.screen}>
      <MapCanvas variant="light" route />
      <View style={styles.topBar}>
        <IconButton icon="chevron-down" />
        <Pressable style={styles.shareMini}><Ionicons name="share-social" size={18} color={ink} /><Text style={styles.shareText}>Share Trip</Text></Pressable>
      </View>
      <View style={styles.arrivingTitle}>
        <Text style={styles.mapTitle}>Your driver is arriving</Text>
        <Text style={styles.bodyText}>Please be ready at the pickup point</Text>
      </View>
      <View style={styles.driverCard}>
        <DriverProfile />
        <View style={styles.statsLine}>
          <Metric value="2 min" label="Away" />
          <Metric value="0.6 km" label="From you" />
          <Metric value="White" label="Vehicle" />
        </View>
      </View>
      <TripPanel />
    </View>
  );
}

function ActiveTripScreen() {
  return (
    <View style={styles.screen}>
      <MapCanvas variant="dark" route />
      <View style={styles.topBar}>
        <IconButton icon="chevron-down" />
        <IconButton icon="medkit" danger />
      </View>
      <View style={styles.tripProgress}>
        <Text style={styles.tripTitle}>On trip to OR Tambo Airport</Text>
        <Text style={styles.tripEta}>Arriving in 21 min</Text>
        <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        <DriverProfile compact />
        <View style={styles.quickRow}>
          <RoundAction icon="share-social" label="Share" />
          <RoundAction icon="call" label="Call" />
          <RoundAction icon="shield-checkmark" label="Safety" />
        </View>
      </View>
    </View>
  );
}

function PaymentScreen() {
  const methods = [
    ['Cash', 'Pay the driver at drop-off', 'cash'],
    ['Card', 'Visa, Mastercard and debit cards', 'card'],
    ['EFT', 'Manual bank transfer option', 'business'],
    ['Wallet', 'Top up and ride faster', 'wallet'],
  ] as const;

  return (
    <View style={[styles.screen, styles.whiteScreen]}>
      <Text style={styles.screenHeading}>Payment</Text>
      <View style={styles.fareCard}>
        <Text style={styles.bodyText}>Trip fare</Text>
        <Text style={styles.fare}>R96.00</Text>
        <Text style={styles.smallText}>Sandton to OR Tambo Airport</Text>
      </View>
      {methods.map(([name, desc, icon], index) => (
        <Pressable key={name} style={[styles.paymentRow, index === 0 && styles.paymentSelected]}>
          <View style={styles.paymentIcon}><Ionicons name={icon} size={26} color={index === 0 ? '#fff' : blue} /></View>
          <View style={styles.rideDetails}>
            <Text style={styles.rideName}>{name}</Text>
            <Text style={styles.smallText}>{desc}</Text>
          </View>
          {index === 0 && <Ionicons name="checkmark-circle" size={24} color={blue} />}
        </Pressable>
      ))}
      <View style={styles.laterBox}>
        <Text style={styles.infoTitle}>Later payment integrations</Text>
        <Text style={styles.smallText}>Ozow • SnapScan • Yoco • Apple Pay • Google Pay</Text>
      </View>
      <PrimaryButton label="Confirm Cash Payment" />
    </View>
  );
}

function RatingScreen() {
  const tags = ['Clean Car', 'Friendly', 'Safe Driving', 'Late', 'Poor Navigation'];
  return (
    <View style={[styles.screen, styles.whiteScreen, styles.ratingScreen]}>
      <Text style={styles.screenHeading}>Rate your trip</Text>
      <View style={styles.avatarLarge}><Text style={styles.avatarText}>TM</Text></View>
      <Text style={styles.driverName}>Thabo M.</Text>
      <Text style={styles.bodyText}>Toyota Corolla • CAA 123 GP</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => <Ionicons key={star} name="star" size={38} color="#ffb000" />)}
      </View>
      <View style={styles.tagWrap}>
        {tags.map((tag, index) => (
          <Pressable key={tag} style={[styles.tag, index < 3 && styles.tagActive]}>
            <Text style={[styles.tagText, index < 3 && styles.tagTextActive]}>{tag}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput style={styles.commentBox} placeholder="Leave a note for your driver" placeholderTextColor={muted} />
      <PrimaryButton label="Submit Rating" />
    </View>
  );
}

function GoOnlineScreen() {
  return (
    <View style={[styles.screen, styles.whiteScreen]}>
      <View style={styles.driverHomeTop}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.driverHomeName}>Sipho <Ionicons name="shield-checkmark" size={18} color={blue} /></Text>
          <Text style={styles.ratingText}>★ 4.8</Text>
        </View>
        <IconButton icon="notifications" alert />
      </View>
      <View style={styles.earningsCard}>
        <Text style={styles.smallText}>Today's Earnings</Text>
        <Text style={styles.money}>R850.00</Text>
        <View style={styles.statsLine}>
          <Metric value="7" label="Trips" />
          <Metric value="4h 32m" label="Online" />
        </View>
      </View>
      <View style={styles.performanceCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.infoTitle}>Performance</Text>
          <Text style={styles.link}>View all</Text>
        </View>
        <View style={styles.statsLine}>
          <Metric value="100%" label="Acceptance" />
          <Metric value="4.9 ★" label="Rating" />
          <Metric value="98%" label="Completion" />
        </View>
      </View>
      <LinearGradient colors={['#e8fff2', '#f6fbff']} style={styles.onlinePanel}>
        <View>
          <Text style={styles.onlineTitle}>You're offline</Text>
          <Text style={styles.smallText}>Go online to start receiving ride requests.</Text>
        </View>
        <View style={styles.powerButton}><Ionicons name="power" size={34} color="#17a64a" /></View>
      </LinearGradient>
      <BottomNav active="Home" driver />
    </View>
  );
}

function RideRequestScreen() {
  return (
    <View style={styles.screen}>
      <MapCanvas variant="dark" />
      <View style={styles.requestCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.infoTitle}>New ride request</Text>
          <Text style={styles.timer}>13s</Text>
        </View>
        <LocationInput icon="radio-button-on" value="123 Main Road" label="Sandton" />
        <LocationInput icon="location" value="OR Tambo Airport" label="Kempton Park" />
        <View style={styles.fareRow}>
          <View>
            <Text style={styles.smallText}>Est. Fare</Text>
            <Text style={styles.fareSmall}>R96.00 <Text style={styles.cashBadge}>Cash</Text></Text>
          </View>
          <Text style={styles.link}>15.4 km</Text>
        </View>
        <View style={styles.statsLine}>
          <Metric value="4.8 ★" label="User rating" />
          <Metric value="15 min" label="Estimated trip" />
        </View>
        <View style={styles.requestActions}>
          <Pressable style={styles.decline}><Text style={styles.declineText}>Decline</Text></Pressable>
          <Pressable style={styles.accept}><Text style={styles.acceptText}>Accept</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function MapCanvas({ variant = 'light', route = false, search = false }: { variant?: 'light' | 'dark'; route?: boolean; search?: boolean }) {
  const dark = variant === 'dark';
  return (
    <View style={[styles.map, dark && styles.mapDark]}>
      {Array.from({ length: 9 }).map((_, index) => (
        <View
          key={`road-a-${index}`}
          style={[
            styles.road,
            dark && styles.roadDark,
            { top: 40 + index * 58, transform: [{ rotate: index % 2 ? '-32deg' : '28deg' }] },
          ]}
        />
      ))}
      {Array.from({ length: 7 }).map((_, index) => (
        <View
          key={`road-b-${index}`}
          style={[
            styles.roadVertical,
            dark && styles.roadDark,
            { left: 20 + index * 58, transform: [{ rotate: index % 2 ? '22deg' : '-16deg' }] },
          ]}
        />
      ))}
      {!dark && <><View style={[styles.park, { top: 118, left: 36 }]} /><View style={[styles.park, { bottom: 140, right: 28 }]} /></>}
      {route && <View style={styles.routeLine} />}
      {search && <View style={styles.searchRing} />}
      <View style={styles.userDot}><View style={styles.userDotInner} /></View>
      {['car-sport', 'car', 'car-sport', 'car'].map((icon, index) => (
        <View key={`${icon}-${index}`} style={[styles.mapCar, { top: 145 + index * 72, left: index % 2 ? 228 : 64 }]}>
          <Ionicons name={icon as IconName} size={22} color={dark ? '#e7efff' : '#14213d'} />
        </View>
      ))}
    </View>
  );
}

function DriverProfile({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.driverProfile, compact && styles.driverProfileCompact]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>TM</Text></View>
      <View style={styles.rideDetails}>
        <View style={styles.driverNameRow}>
          <Text style={styles.driverName}>Thabo M.</Text>
          <Text style={styles.ratingBadge}>★ 4.8</Text>
        </View>
        <Text style={styles.smallText}>Toyota Corolla • White</Text>
        <Text style={styles.smallStrong}>CAA 123 GP</Text>
      </View>
      {!compact && <IconButton icon="call" />}
    </View>
  );
}

function TripPanel() {
  return (
    <View style={styles.tripPanel}>
      <LocationInput icon="radio-button-on" value="123 Main Road, Sandton" label="Pickup" />
      <LocationInput icon="location" value="OR Tambo Airport" label="Destination" />
      <View style={styles.quickRow}>
        <RoundAction icon="call" label="Call Driver" />
        <RoundAction icon="chatbubble" label="Message" />
        <RoundAction icon="close-circle" label="Cancel Ride" danger />
        <RoundAction icon="shield-checkmark" label="Safety" />
      </View>
      <View style={styles.tip}><Text style={styles.smallText}><Text style={styles.link}>Tip:</Text> You can share your trip with a loved one for added safety.</Text></View>
    </View>
  );
}

function BottomNav({ active, driver = false }: { active: string; driver?: boolean }) {
  const items = driver
    ? [['home', 'Home'], ['time', 'Earnings'], ['receipt', 'Trips'], ['wallet', 'Wallet'], ['person', 'Profile']]
    : [['home', 'Home'], ['time', 'Trips'], ['receipt', 'Activity'], ['person', 'Profile']];
  return (
    <View style={styles.bottomNav}>
      {items.map(([icon, label]) => (
        <View key={label} style={styles.navItem}>
          <Ionicons name={icon as IconName} size={24} color={active === label ? blue : '#536079'} />
          <Text style={[styles.navLabel, active === label && styles.navLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function CityBackground() {
  return (
    <View style={styles.city}>
      {[30, 66, 44, 82, 58, 110, 76].map((height, index) => (
        <View key={index} style={[styles.tower, { height, left: index * 42, opacity: 0.16 + index * 0.02 }]} />
      ))}
      <View style={styles.splashRoad} />
      <Ionicons name="car-sport" size={80} color="rgba(255,255,255,0.13)" style={styles.splashCar} />
    </View>
  );
}

function CityMini() {
  return (
    <View style={styles.cityMini}>
      {[44, 72, 56, 92, 66].map((height, index) => <View key={index} style={[styles.towerMini, { height }]} />)}
    </View>
  );
}

function IconButton({ icon, alert = false, danger = false }: { icon: IconName; alert?: boolean; danger?: boolean }) {
  return (
    <View style={[styles.iconButton, danger && styles.iconDanger]}>
      <Ionicons name={icon} size={24} color={danger ? '#ef233c' : ink} />
      {alert && <View style={styles.alertDot} />}
    </View>
  );
}

function FloatingAction({ icon, label, danger = false }: { icon: IconName; label: string; danger?: boolean }) {
  return (
    <View style={styles.floatAction}>
      <Ionicons name={icon} size={24} color={danger ? '#ef233c' : blue} />
      <Text style={styles.floatLabel}>{label}</Text>
    </View>
  );
}

function PrimaryButton({ label, icon }: { label: string; icon?: IconName }) {
  return (
    <Pressable style={styles.primaryButton}>
      <Text style={styles.primaryText}>{label}</Text>
      {icon && <Ionicons name={icon} size={24} color="#fff" />}
    </Pressable>
  );
}

function SocialButton({ icon, label, dark = false }: { icon: IconName; label: string; dark?: boolean }) {
  return (
    <Pressable style={styles.socialButton}>
      <Ionicons name={icon} size={22} color={dark ? '#000' : '#4285f4'} />
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
  );
}

function LocationInput({ icon, value, label, muted: isMuted = false }: { icon: IconName; value: string; label?: string; muted?: boolean }) {
  return (
    <View style={styles.locationInput}>
      <Ionicons name={icon} size={22} color={icon === 'location' ? '#ef3b2f' : blue} />
      <View style={styles.rideDetails}>
        {label && <Text style={styles.locationLabel}>{label}</Text>}
        <Text style={[styles.locationValue, isMuted && styles.locationMuted]}>{value}</Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={muted} />
    </View>
  );
}

function QuickAction({ icon, title, sub }: { icon: IconName; title: string; sub: string }) {
  return (
    <View style={styles.quickAction}>
      <Ionicons name={icon} size={24} color={blue} />
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSub}>{sub}</Text>
    </View>
  );
}

function RoundAction({ icon, label, danger = false }: { icon: IconName; label: string; danger?: boolean }) {
  return (
    <View style={styles.roundAction}>
      <Ionicons name={icon} size={26} color={danger ? '#ef233c' : blue} />
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Dots({ active }: { active: number }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((dot) => <View key={dot} style={[styles.dot, active === dot && styles.dotActive]} />)}
    </View>
  );
}

function DividerLabel({ label }: { label: string }) {
  return (
    <View style={styles.dividerLabel}>
      <View style={styles.divider} />
      <Text style={styles.smallText}>{label}</Text>
      <View style={styles.divider} />
    </View>
  );
}

function Key({ n }: { n: string }) {
  return (
    <View style={styles.key}><Text style={styles.keyText}>{n}</Text></View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: '#eef3fb',
  },
  shellHeader: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  eyebrow: {
    color: blue,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  shellTitle: {
    color: ink,
    fontSize: 24,
    fontWeight: '900',
  },
  modeSwitch: {
    backgroundColor: '#dde6f6',
    borderRadius: 18,
    flexDirection: 'row',
    padding: 4,
  },
  modePill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: '#fff',
  },
  modePillText: {
    color: muted,
    fontWeight: '800',
  },
  modePillTextActive: {
    color: blue,
  },
  screenTabs: {
    paddingHorizontal: 14,
    gap: 8,
    paddingBottom: 12,
  },
  tabScroller: {
    flexGrow: 0,
    maxHeight: 52,
  },
  screenTab: {
    backgroundColor: '#fff',
    borderColor: '#d7deeb',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    height: 38,
  },
  screenTabActive: {
    backgroundColor: blue,
    borderColor: blue,
  },
  screenTabText: {
    color: muted,
    fontWeight: '800',
    fontSize: 13,
  },
  screenTabTextActive: {
    color: '#fff',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 18,
  },
  phoneFrame: {
    width: 390,
    height: 812,
    borderRadius: 42,
    borderWidth: 8,
    borderColor: '#05070d',
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  notch: {
    position: 'absolute',
    zIndex: 20,
    top: 0,
    alignSelf: 'center',
    width: 150,
    height: 30,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: '#05070d',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f6f9ff',
  },
  whiteScreen: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 64,
  },
  city: {
    ...StyleSheet.absoluteFill,
    top: 235,
  },
  tower: {
    position: 'absolute',
    bottom: 240,
    width: 34,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#fff',
  },
  splashRoad: {
    position: 'absolute',
    left: -24,
    right: -24,
    bottom: 105,
    height: 150,
    borderRadius: 140,
    borderTopWidth: 18,
    borderColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '-18deg' }],
  },
  splashCar: {
    position: 'absolute',
    right: 38,
    bottom: 194,
  },
  splashCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logo: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 0,
  },
  logoTag: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  driverTag: {
    color: '#fff',
    marginTop: 18,
    fontSize: 18,
    fontWeight: '800',
  },
  whiteWave: {
    height: 88,
    backgroundColor: '#fff',
    borderTopLeftRadius: 90,
    borderTopRightRadius: 35,
  },
  loader: {
    position: 'absolute',
    bottom: 34,
    alignSelf: 'center',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: blue,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  skip: {
    alignSelf: 'flex-end',
    color: blue,
    fontWeight: '800',
  },
  illustration: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityMini: {
    position: 'absolute',
    top: 26,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  towerMini: {
    width: 34,
    backgroundColor: '#e8eef8',
    borderRadius: 8,
  },
  illustrationCircle: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#edf4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeFloat: {
    position: 'absolute',
    right: 44,
    top: 78,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: blue,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  onboardingCopy: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  bigTitle: {
    color: ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  blueText: {
    color: blue,
  },
  bodyText: {
    color: muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#c7cfda',
  },
  dotActive: {
    backgroundColor: blue,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 18,
  },
  primaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  loginScreen: {
    alignItems: 'stretch',
  },
  logoBlock: {
    alignItems: 'center',
    marginTop: 58,
    marginBottom: 58,
  },
  logoBlue: {
    color: blue,
    fontSize: 48,
    fontWeight: '900',
  },
  logoBlueTag: {
    color: blue,
    fontSize: 8,
    fontWeight: '900',
  },
  loginTitle: {
    color: ink,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  phoneInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#d7deeb',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
    marginTop: 34,
    marginBottom: 20,
  },
  flag: {
    fontSize: 26,
  },
  country: {
    fontSize: 18,
    color: ink,
    fontWeight: '700',
  },
  inputDivider: {
    width: 1,
    height: 36,
    backgroundColor: lightLine,
    marginHorizontal: 6,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#41506b',
  },
  dividerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 28,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: lightLine,
  },
  socialButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#d7deeb',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 12,
  },
  socialText: {
    color: ink,
    fontWeight: '800',
  },
  terms: {
    marginTop: 'auto',
    textAlign: 'center',
    color: muted,
    lineHeight: 21,
    fontSize: 12,
  },
  link: {
    color: blue,
    fontWeight: '900',
  },
  otpScreen: {
    alignItems: 'stretch',
  },
  otpSub: {
    color: muted,
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 14,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 20,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d7deeb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpActive: {
    borderColor: blue,
    backgroundColor: '#edf4ff',
  },
  otpNum: {
    color: ink,
    fontSize: 24,
    fontWeight: '800',
  },
  resend: {
    color: blue,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 36,
  },
  infoCard: {
    backgroundColor: '#f1f5fb',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#dceaff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    color: ink,
    fontSize: 16,
    fontWeight: '900',
  },
  infoCopy: {
    flex: 1,
  },
  smallText: {
    color: muted,
    fontSize: 12,
    lineHeight: 18,
  },
  smallStrong: {
    color: '#23304a',
    fontSize: 12,
    fontWeight: '800',
  },
  keypad: {
    marginTop: 'auto',
    backgroundColor: '#e8edf4',
    marginHorizontal: -24,
    marginBottom: -24,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  key: {
    width: '31%',
    height: 56,
    borderRadius: 7,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    color: ink,
    fontSize: 24,
    fontWeight: '500',
  },
  map: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#f4f7fb',
    overflow: 'hidden',
  },
  mapDark: {
    backgroundColor: '#2a313d',
  },
  road: {
    position: 'absolute',
    left: -80,
    right: -80,
    height: 16,
    backgroundColor: '#fff',
    opacity: 0.94,
  },
  roadVertical: {
    position: 'absolute',
    top: -90,
    bottom: -90,
    width: 13,
    backgroundColor: '#fff',
    opacity: 0.88,
  },
  roadDark: {
    backgroundColor: '#48505d',
    opacity: 0.9,
  },
  park: {
    position: 'absolute',
    width: 86,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#cfead7',
    opacity: 0.75,
  },
  routeLine: {
    position: 'absolute',
    left: 175,
    top: 308,
    width: 104,
    height: 124,
    borderLeftWidth: 7,
    borderTopWidth: 7,
    borderColor: blue,
    borderTopLeftRadius: 18,
    transform: [{ rotate: '34deg' }],
  },
  searchRing: {
    position: 'absolute',
    top: 232,
    left: 62,
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: blue,
    opacity: 0.7,
  },
  userDot: {
    position: 'absolute',
    top: 348,
    left: 178,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(7,87,216,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: blue,
    borderWidth: 4,
    borderColor: '#fff',
  },
  mapCar: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-28deg' }],
  },
  mapTop: {
    paddingTop: 58,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001a55',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  iconDanger: {
    backgroundColor: '#fff2f4',
  },
  alertDot: {
    position: 'absolute',
    top: 13,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff2d2d',
  },
  greeting: {
    color: '#536079',
    fontSize: 14,
    fontWeight: '700',
  },
  mapTitle: {
    color: ink,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  floatRail: {
    position: 'absolute',
    right: 17,
    top: 254,
    gap: 12,
  },
  floatAction: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#001a55',
    shadowOpacity: 0.13,
    shadowRadius: 12,
    elevation: 2,
  },
  floatLabel: {
    color: '#24314b',
    fontSize: 11,
    fontWeight: '800',
  },
  bookingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 78,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    shadowColor: '#001a55',
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 6,
  },
  locationInput: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightLine,
    backgroundColor: '#f8faff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  rideDetails: {
    flex: 1,
  },
  locationLabel: {
    color: muted,
    fontSize: 11,
    fontWeight: '700',
  },
  locationValue: {
    color: ink,
    fontSize: 15,
    fontWeight: '900',
  },
  locationMuted: {
    color: muted,
    fontSize: 18,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 64,
  },
  quickTitle: {
    color: ink,
    fontWeight: '900',
  },
  quickSub: {
    color: muted,
    fontSize: 11,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 74,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: lightLine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navLabel: {
    color: '#536079',
    fontSize: 12,
    fontWeight: '800',
  },
  navLabelActive: {
    color: blue,
  },
  topBar: {
    paddingTop: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    color: ink,
    fontWeight: '900',
    fontSize: 18,
  },
  rideSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    gap: 12,
  },
  sheetTitle: {
    color: ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  rideOption: {
    minHeight: 74,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightLine,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  rideOptionActive: {
    borderColor: blue,
    backgroundColor: '#f2f7ff',
  },
  rideIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#e8f0ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideName: {
    color: ink,
    fontSize: 16,
    fontWeight: '900',
  },
  price: {
    color: ink,
    fontSize: 16,
    fontWeight: '900',
  },
  matchHeader: {
    position: 'absolute',
    top: 94,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  searchBubble: {
    position: 'absolute',
    top: 204,
    alignSelf: 'center',
    width: 210,
    minHeight: 86,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
    shadowColor: '#001a55',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  loaderBlue: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: blue,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  matchStats: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 176,
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    paddingVertical: 14,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  metricValue: {
    color: ink,
    fontSize: 17,
    fontWeight: '900',
  },
  metricLabel: {
    color: muted,
    fontSize: 11,
    textAlign: 'center',
  },
  matchBottom: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 24,
    gap: 12,
  },
  shield: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: lightLine,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#e11931',
    fontSize: 16,
    fontWeight: '900',
  },
  shareMini: {
    minHeight: 44,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareText: {
    color: ink,
    fontWeight: '800',
  },
  arrivingTitle: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  driverCard: {
    position: 'absolute',
    top: 204,
    left: 18,
    right: 18,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 16,
    shadowColor: '#001a55',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 4,
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverProfileCompact: {
    marginTop: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0b1d3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0b1d3a',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 34,
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 19,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverName: {
    color: ink,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  ratingBadge: {
    backgroundColor: blue,
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '900',
  },
  statsLine: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: lightLine,
    marginTop: 14,
    paddingTop: 14,
  },
  tripPanel: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 24,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 14,
    gap: 10,
  },
  roundAction: {
    flex: 1,
    minHeight: 74,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightLine,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  roundLabel: {
    color: '#23304a',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  tip: {
    backgroundColor: '#edf4ff',
    borderRadius: 10,
    padding: 10,
  },
  tripProgress: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 24,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 18,
  },
  tripTitle: {
    color: ink,
    fontSize: 19,
    fontWeight: '900',
  },
  tripEta: {
    color: blue,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e5ecf7',
    borderRadius: 4,
    marginTop: 16,
  },
  progressFill: {
    width: '58%',
    height: 8,
    backgroundColor: blue,
    borderRadius: 4,
  },
  screenHeading: {
    color: ink,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 22,
  },
  fareCard: {
    borderRadius: 16,
    backgroundColor: '#f2f7ff',
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  fare: {
    color: ink,
    fontSize: 42,
    fontWeight: '900',
  },
  paymentRow: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: lightLine,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    gap: 12,
    marginBottom: 12,
  },
  paymentSelected: {
    borderColor: blue,
    backgroundColor: '#f8fbff',
  },
  paymentIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBox: {
    borderRadius: 14,
    backgroundColor: '#f1f5fb',
    padding: 16,
    marginTop: 'auto',
    marginBottom: 14,
  },
  ratingScreen: {
    alignItems: 'stretch',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 30,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  tag: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: lightLine,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tagActive: {
    backgroundColor: blue,
    borderColor: blue,
  },
  tagText: {
    color: muted,
    fontWeight: '800',
  },
  tagTextActive: {
    color: '#fff',
  },
  commentBox: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: lightLine,
    borderRadius: 14,
    padding: 14,
    marginBottom: 'auto',
    textAlignVertical: 'top',
  },
  driverHomeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  driverHomeName: {
    color: ink,
    fontSize: 28,
    fontWeight: '900',
  },
  ratingText: {
    color: '#ffb000',
    fontWeight: '900',
    marginTop: 5,
  },
  earningsCard: {
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: lightLine,
    padding: 18,
    marginTop: 34,
    shadowColor: '#001a55',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  money: {
    color: '#12a84f',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 8,
  },
  performanceCard: {
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: lightLine,
    padding: 18,
    marginTop: 18,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlinePanel: {
    minHeight: 112,
    borderRadius: 16,
    marginTop: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineTitle: {
    color: '#129548',
    fontWeight: '900',
    fontSize: 16,
  },
  powerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestCard: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 52,
    borderRadius: 18,
    backgroundColor: '#fff',
    padding: 16,
    gap: 10,
  },
  timer: {
    backgroundColor: blue,
    color: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontWeight: '900',
  },
  fareRow: {
    borderTopWidth: 1,
    borderColor: lightLine,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fareSmall: {
    color: ink,
    fontSize: 24,
    fontWeight: '900',
  },
  cashBadge: {
    color: blue,
    fontSize: 11,
    backgroundColor: '#e7efff',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  decline: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    color: blue,
    fontWeight: '900',
  },
  accept: {
    flex: 1,
    minHeight: 54,
    borderRadius: 10,
    backgroundColor: blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    color: '#fff',
    fontWeight: '900',
  },
});
