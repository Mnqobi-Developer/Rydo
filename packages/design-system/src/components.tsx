import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PropsWithChildren } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, map = false }: PropsWithChildren<{ map?: boolean }>) {
  return (
    <SafeAreaView style={[styles.screen, map && styles.mapScreen]}>
      {map && <MapCanvas />}
      {children}
    </SafeAreaView>
  );
}

export function AppLogo({ driver = false, light = false }: { driver?: boolean; light?: boolean }) {
  return (
    <View style={styles.logoWrap}>
      <Text style={[styles.logo, light && styles.light]}>RYDO</Text>
      <Text style={[styles.logoTag, light && styles.light]}>
        {driver ? 'D R I V E R' : 'T A K I N G   Y O U   P L A C E S'}
      </Text>
    </View>
  );
}

export function Splash({ driver = false }: { driver?: boolean }) {
  return (
    <LinearGradient colors={['#0869ee', '#0048bd', '#002d87']} style={styles.splash}>
      <View style={styles.skyline}>
        {[76, 118, 92, 146, 105].map((height, index) => (
          <View key={index} style={[styles.tower, { height }]} />
        ))}
      </View>
      <AppLogo driver={driver} light />
      <Text style={styles.splashTag}>{driver ? 'Drive. Earn. Grow.' : 'Taking You Places'}</Text>
      <View style={styles.splashCurve} />
    </LinearGradient>
  );
}

export function Header({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.buttonDisabled]}>
      <Text style={styles.buttonText}>{label}</Text>
      {icon ? <Ionicons name={icon} size={22} color="#fff" /> : null}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  danger = false,
}: {
  label: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryButton}>
      <Text style={[styles.secondaryText, danger && styles.dangerText]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, danger = false }: { icon: IconName; onPress?: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={24} color={danger ? colors.danger : colors.navy} />
    </Pressable>
  );
}

export function LocationField({
  label,
  value,
  destination = false,
}: {
  label?: string;
  value: string;
  destination?: boolean;
}) {
  return (
    <View style={styles.location}>
      <Ionicons name={destination ? 'location' : 'radio-button-on'} size={22} color={destination ? colors.danger : colors.blue} />
      <View style={styles.flex}>
        {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
        <Text style={styles.fieldValue}>{value}</Text>
      </View>
      <Ionicons name="chevron-down" size={18} color={colors.muted} />
    </View>
  );
}

export function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export function DriverProfile({
  initials = 'DR',
  name = 'Assigned driver',
  detail = 'Driver details will appear after assignment',
  plate = 'Vehicle details pending',
}: {
  initials?: string;
  name?: string;
  detail?: string;
  plate?: string;
}) {
  return (
    <View style={styles.driverProfile}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      <View style={styles.flex}>
        <View style={styles.profileTitle}>
          <Text style={styles.profileName}>{name}</Text>
          <Ionicons name="shield-checkmark" size={18} color={colors.blue} />
        </View>
        <Text style={styles.body}>{detail}</Text>
        <Text style={styles.plate}>{plate}</Text>
      </View>
    </View>
  );
}

export function MapCanvas({ dark = false, route = false }: { dark?: boolean; route?: boolean }) {
  return (
    <View style={[styles.map, dark && styles.mapDark]}>
      {Array.from({ length: 9 }).map((_, index) => (
        <View
          key={`h-${index}`}
          style={[styles.road, dark && styles.roadDark, { top: 30 + index * 70, transform: [{ rotate: index % 2 ? '-25deg' : '31deg' }] }]}
        />
      ))}
      {Array.from({ length: 7 }).map((_, index) => (
        <View
          key={`v-${index}`}
          style={[styles.verticalRoad, dark && styles.roadDark, { left: 16 + index * 64, transform: [{ rotate: index % 2 ? '18deg' : '-19deg' }] }]}
        />
      ))}
      {route && <View style={styles.route} />}
      <View style={styles.userDot}><View style={styles.userDotInner} /></View>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={[styles.car, { top: 165 + index * 96, left: index % 2 ? 260 : 70 }]}>
          <Ionicons name="car-sport" size={22} color={dark ? '#fff' : colors.navy} />
        </View>
      ))}
    </View>
  );
}

export function BottomTabs({
  items,
  active,
  onPress,
}: {
  items: Array<{ label: string; icon: IconName }>;
  active: string;
  onPress: (label: string) => void;
}) {
  return (
    <View style={styles.tabs}>
      {items.map((item) => (
        <Pressable key={item.label} onPress={() => onPress(item.label)} style={styles.tab}>
          <Ionicons name={item.icon} size={24} color={active === item.label ? colors.blue : colors.muted} />
          <Text style={[styles.tabLabel, active === item.label && styles.tabActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const textStyles = StyleSheet.create({
  heading: { color: colors.navy, fontSize: 28, fontWeight: '900' },
  subheading: { color: colors.navy, fontSize: 20, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  link: { color: colors.blue, fontWeight: '800' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  mapScreen: { overflow: 'hidden' },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoWrap: { alignItems: 'center' },
  logo: { color: colors.blue, fontSize: 56, fontWeight: '900', letterSpacing: 0 },
  logoTag: { color: colors.blue, fontSize: 9, fontWeight: '900' },
  light: { color: '#fff' },
  splashTag: { color: '#fff', fontSize: 17, fontWeight: '700', marginTop: 20 },
  skyline: { position: 'absolute', bottom: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 12, opacity: 0.12 },
  tower: { width: 52, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#fff' },
  splashCurve: { position: 'absolute', bottom: -80, width: '130%', height: 170, borderRadius: 100, backgroundColor: '#fff' },
  header: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line },
  button: { minHeight: 58, borderRadius: 12, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  secondaryButton: { minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.blue, fontSize: 16, fontWeight: '900' },
  dangerText: { color: colors.danger },
  iconButton: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  location: { minHeight: 68, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: '#f8faff', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  fieldValue: { color: colors.navy, fontSize: 15, fontWeight: '900' },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricValue: { color: colors.navy, fontSize: 17, fontWeight: '900' },
  metricLabel: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  driverProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  profileTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { color: colors.navy, fontSize: 18, fontWeight: '900' },
  rating: { color: '#fff', backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 12, marginTop: 3 },
  plate: { color: colors.navy, fontSize: 12, fontWeight: '900', marginTop: 2 },
  map: { ...StyleSheet.absoluteFill, backgroundColor: '#eef3fa', overflow: 'hidden' },
  mapDark: { backgroundColor: '#29313d' },
  road: { position: 'absolute', left: -100, right: -100, height: 18, backgroundColor: '#fff', opacity: 0.9 },
  verticalRoad: { position: 'absolute', top: -100, bottom: -100, width: 14, backgroundColor: '#fff', opacity: 0.85 },
  roadDark: { backgroundColor: '#4b5563', opacity: 0.9 },
  route: { position: 'absolute', left: '44%', top: '28%', width: 120, height: 230, borderLeftWidth: 7, borderTopWidth: 7, borderColor: colors.blue, borderTopLeftRadius: 20, transform: [{ rotate: '30deg' }] },
  userDot: { position: 'absolute', top: '44%', left: '44%', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(7,87,216,0.2)', alignItems: 'center', justifyContent: 'center' },
  userDotInner: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.blue, borderWidth: 4, borderColor: '#fff' },
  car: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  tabs: { minHeight: 74, backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.line, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  tab: { alignItems: 'center', gap: 4, minWidth: 54 },
  tabLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  tabActive: { color: colors.blue },
});
