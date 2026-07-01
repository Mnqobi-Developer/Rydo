import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { requestAdminOtp } from '../api/adminApi';
import { useAdminAuth } from '../auth/AdminAuthContext';

const colors = {
  blue: '#0757d8',
  navy: '#07112f',
  muted: '#64708a',
  line: '#dbe3ef',
  background: '#f4f7fb',
  danger: '#e11d48',
  white: '#ffffff',
};

export function AdminLoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAdminAuth();

  const requestCode = async () => {
    const formattedPhone = formatSouthAfricanPhone(phoneNumber);
    if (!formattedPhone) {
      setError('Enter a valid South African mobile number.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await requestAdminOtp(formattedPhone);
      setPhoneNumber(formattedPhone);
      setCodeRequested(true);
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    const formattedPhone = formatSouthAfricanPhone(phoneNumber);
    if (!formattedPhone || code.length !== 6) {
      setError('Enter your phone number and 6-digit OTP.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await signIn(formattedPhone, code, displayName.trim() || 'Rydo Admin');
      router.replace('/');
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.panel}>
        <View style={styles.brandMark}><Text style={styles.logo}>RYDO</Text><Text style={styles.logoTag}>ADMIN OPERATIONS</Text></View>
        <View style={styles.copy}>
          <Text style={styles.heading}>Control center</Text>
          <Text style={styles.body}>Monitor users, drivers, trips, payments, disputes, and live operations from one desktop dashboard.</Text>
        </View>
        <View style={styles.trustRow}>
          <Feature icon="map" label="Live dispatch map" />
          <Feature icon="cash" label="Payment visibility" />
          <Feature icon="shield-checkmark" label="Operations controls" />
        </View>
      </View>

      <View style={styles.loginCard}>
        <Text style={styles.formTitle}>Admin sign in</Text>
        <Text style={styles.formBody}>Use the development OTP code after requesting access.</Text>
        <TextInput value={displayName} onChangeText={setDisplayName} style={styles.input} placeholder="Admin name" autoCapitalize="words" />
        <View style={styles.phoneRow}>
          <Text style={styles.country}>+27</Text>
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} style={styles.phoneInput} placeholder="72 123 4567" keyboardType="phone-pad" />
        </View>
        {codeRequested ? <TextInput value={code} onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))} style={styles.input} placeholder="123456" keyboardType="number-pad" maxLength={6} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={submitting} onPress={() => codeRequested ? void verifyCode() : void requestCode()} style={[styles.button, submitting && styles.disabled]}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{codeRequested ? 'Open Dashboard' : 'Request OTP'}</Text>}
        </Pressable>
        <Text style={styles.hint}>Development OTP: 123456</Text>
      </View>
    </View>
  );
}

function Feature({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name={icon} size={20} color={colors.blue} />
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
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
  if (phoneNumber.startsWith('+27') && digits.length === 11) {
    return phoneNumber;
  }
  return '';
}

function getRequestErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 720, backgroundColor: colors.background, flexDirection: 'row', padding: 28, gap: 28 },
  panel: { flex: 1.2, borderRadius: 8, backgroundColor: colors.navy, padding: 34, justifyContent: 'space-between' },
  brandMark: { gap: 4 },
  logo: { color: colors.white, fontSize: 52, fontWeight: '900', letterSpacing: 0 },
  logoTag: { color: '#9dbdff', fontSize: 12, fontWeight: '900' },
  copy: { maxWidth: 680, gap: 14 },
  heading: { color: colors.white, fontSize: 44, lineHeight: 50, fontWeight: '900' },
  body: { color: '#d4def2', fontSize: 18, lineHeight: 28 },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  feature: { minHeight: 48, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { color: colors.white, fontWeight: '800' },
  loginCard: { width: 430, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 28, alignSelf: 'center', gap: 14 },
  formTitle: { color: colors.navy, fontSize: 28, fontWeight: '900' },
  formBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, color: colors.navy, fontSize: 16 },
  phoneRow: { minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center' },
  country: { paddingHorizontal: 14, color: colors.navy, fontSize: 16, fontWeight: '900', borderRightWidth: 1, borderRightColor: colors.line },
  phoneInput: { flex: 1, minHeight: 52, paddingHorizontal: 14, color: colors.navy, fontSize: 16 },
  error: { color: colors.danger, fontSize: 13 },
  button: { minHeight: 56, borderRadius: 8, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  hint: { color: colors.muted, textAlign: 'center', fontSize: 12 },
});
