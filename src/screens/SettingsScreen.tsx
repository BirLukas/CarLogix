import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';

type SettingsNavProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const navigation = useNavigation<SettingsNavProp>();
  const { user, signOut } = useAuth();

  const [isMechanicMode, setIsMechanicMode] = useState(user?.isMechanic || false);
  const [workshopName, setWorkshopName] = useState(user?.workshopName || 'Autoservis Černík');

  const handleToggleMechanic = (val: boolean) => {
    setIsMechanicMode(val);
    Alert.alert(
      val ? 'Režim dílny aktivován' : 'Osobní režim aktivován',
      val
        ? 'Nyní můžete zapisovat servisní úkony jako ověřený mechanik a spravovat klientská vozidla.'
        : 'Přepnuto do běžného režimu řidiče.'
    );
  };

  const handleSignOut = () => {
    Alert.alert('Odhlášení', 'Opravdu se chcete odhlásit ze svého účtu?', [
      { text: 'Zrušit', style: 'cancel' },
      { text: 'Odhlásit', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'CL';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Ambient glowing backdrop orbs */}
      <View pointerEvents="none" style={[styles.ambientTopGlow, { backgroundColor: theme.ambientGlowPrimary }]} />
      <View pointerEvents="none" style={[styles.ambientMidGlow, { backgroundColor: theme.ambientGlowSecondary }]} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Nastavení & Profil</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Konfigurace účtu a předvoleb aplikace
          </Text>
        </View>

        {/* User Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              shadowColor: theme.shadowColor,
              shadowOpacity: theme.shadowOpacity,
            },
          ]}
        >
          <View style={styles.profileRow}>
            {/* Avatar with #FF018F / #2A0C62 Neon Halo */}
            <View style={styles.avatarHalo}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.textPrimary }]}>
                {user?.displayName || 'Lukáš Černík'}
              </Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>
                {user?.email || 'lukas.cernik@example.cz'}
              </Text>
              <View
                style={[
                  styles.verifiedBadge,
                  {
                    backgroundColor: user?.emailVerified
                      ? isDark ? 'rgba(6, 78, 59, 0.5)' : 'rgba(16, 185, 129, 0.12)'
                      : isDark ? 'rgba(120, 53, 15, 0.5)' : 'rgba(245, 158, 11, 0.12)',
                    borderColor: user?.emailVerified
                      ? isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.3)'
                      : isDark ? 'rgba(245, 158, 11, 0.4)' : 'rgba(245, 158, 11, 0.3)',
                  },
                ]}
              >
                <Ionicons
                  name={user?.emailVerified ? 'checkmark-circle' : 'time'}
                  size={13}
                  color={user?.emailVerified ? theme.success : theme.warning}
                />
                <Text
                  style={[
                    styles.verifiedText,
                    { color: user?.emailVerified ? theme.success : theme.warning },
                  ]}
                >
                  {user?.emailVerified ? 'E-mail ověřen' : 'Čeká na ověření'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Work Context Switcher (RBAC) */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PRACOVNÍ KONTEXT (RBAC)</Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              shadowColor: theme.shadowColor,
              shadowOpacity: theme.shadowOpacity,
            },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Režim servisní dílny</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                Zpřístupní zápis servisních úkonů a správu klientských vozů
              </Text>
            </View>
            <Switch
              value={isMechanicMode}
              onValueChange={handleToggleMechanic}
              trackColor={{ false: theme.border, true: '#FF018F' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isMechanicMode && (
            <View style={[styles.workshopInputBox, { borderTopColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Název provozovny / servisu:</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                value={workshopName}
                onChangeText={setWorkshopName}
                placeholder="Např. Autoservis Novák"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          )}
        </View>

        {/* System & Accessibility */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>VZHLED & SYSTÉM</Text>
        </View>

        <View
          style={[
            styles.cardDivided,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              shadowColor: theme.shadowColor,
              shadowOpacity: theme.shadowOpacity,
            },
          ]}
        >
          {/* Row 1: Barevný motiv */}
          <View style={styles.settingRowDivided}>
            <View style={styles.settingTextGroup}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Barevný motiv</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                {colorScheme === 'dark' ? 'Tmavý režim (dle systému)' : 'Světlý režim (dle systému)'}
              </Text>
            </View>
            <View style={[styles.themeIconBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
              <Ionicons
                name={colorScheme === 'dark' ? 'moon' : 'sunny'}
                size={18}
                color="#FF018F"
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Row 2: Podmínky používání & Soukromí */}
          <TouchableOpacity
            style={styles.settingRowDivided}
            onPress={() => navigation.navigate('TermsOfService')}
            activeOpacity={0.7}
          >
            <View style={styles.settingTextGroup}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Podmínky používání & Soukromí</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                Zásady ochrany osobních údajů dle směrnice
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Action Button */}
        <TouchableOpacity
          style={[
            styles.signOutBtn,
            {
              backgroundColor: isDark ? 'rgba(42, 12, 98, 0.3)' : 'rgba(239, 68, 68, 0.08)',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(239, 68, 68, 0.25)',
            },
          ]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={19} color="#F87171" style={styles.btnIcon} />
          <Text style={styles.signOutText}>Odhlásit se z aplikace</Text>
        </TouchableOpacity>

        {/* About App Box */}
        <View
          style={[
            styles.aboutBox,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              shadowColor: theme.shadowColor,
              shadowOpacity: theme.shadowOpacity,
            },
          ]}
        >
          <View style={styles.aboutRow}>
            <Text style={styles.lightningIcon}>⚡</Text>
            <Text style={[styles.appName, { color: theme.textPrimary }]}>CarLogix v0.1.0</Text>
          </View>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            Maturitní projekt • Obor Informační technologie
          </Text>
          <Text style={[styles.aboutTextMuted, { color: theme.textSecondary }]}>
            Autor: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>Lukáš Černík</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    position: 'relative',
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255, 1, 143, 0.12)',
  },
  ambientMidGlow: {
    position: 'absolute',
    top: '38%',
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(42, 12, 98, 0.45)',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#332352',
    backgroundColor: 'rgba(35, 30, 44, 0.95)',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#2A0C62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarHalo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    backgroundColor: '#2A0C62',
    borderWidth: 1.5,
    borderColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    backgroundColor: '#1E1432',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 12.5,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 7,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#9CA3AF',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2D253D',
    backgroundColor: '#212124',
    padding: 16,
    marginBottom: 16,
  },
  cardDivided: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2D253D',
    backgroundColor: '#212124',
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingRowDivided: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  themeIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 12, 98, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 1, 143, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D2A36',
  },
  workshopInputBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2A36',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#2D253D',
    backgroundColor: '#121118',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(42, 12, 98, 0.3)',
    marginBottom: 16,
  },
  btnIcon: {
    marginRight: 8,
  },
  signOutText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F87171',
    letterSpacing: 0.2,
  },
  aboutBox: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2B253B',
    backgroundColor: '#1D1B22',
    padding: 18,
    alignItems: 'center',
    marginTop: 2,
    shadowColor: '#2A0C62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lightningIcon: {
    fontSize: 14,
  },
  appName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  aboutText: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  aboutTextMuted: {
    fontSize: 11.5,
    marginTop: 2,
    textAlign: 'center',
  },
});

