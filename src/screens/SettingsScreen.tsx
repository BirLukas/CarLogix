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
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Nastavení & Profil</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Konfigurace účtu a předvoleb aplikace
          </Text>
        </View>

        {/* User Profile Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarText}>{initials}</Text>
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
                  { backgroundColor: user?.emailVerified ? theme.success + '20' : theme.warning + '20' },
                ]}
              >
                <Ionicons
                  name={user?.emailVerified ? 'checkmark-circle' : 'time'}
                  size={14}
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
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pracovní kontext (RBAC)</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
              trackColor={{ false: theme.border, true: theme.accent }}
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
                    backgroundColor: theme.background,
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
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Vzhled & Systém</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextGroup}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Barevný motiv</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                {colorScheme === 'dark' ? 'Tmavý režim (dle systému)' : 'Světlý režim (dle systému)'}
              </Text>
            </View>
            <Ionicons
              name={colorScheme === 'dark' ? 'moon' : 'sunny'}
              size={22}
              color={theme.accent}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('TermsOfService')}
            activeOpacity={0.7}
          >
            <View style={styles.settingTextGroup}>
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>Podmínky používání & Soukromí</Text>
              <Text style={[styles.settingSub, { color: theme.textSecondary }]}>
                Zásady ochrany osobních údajů dle směrnice
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Action Button */}
        <TouchableOpacity
          style={[styles.signOutBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.danger} style={styles.btnIcon} />
          <Text style={[styles.signOutText, { color: theme.danger }]}>Odhlásit se z aplikace</Text>
        </TouchableOpacity>

        {/* About App */}
        <View style={[styles.aboutBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.appName, { color: theme.textPrimary }]}>CarLogix v0.1.0</Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            Maturitní projekt • Obor Informační technologie
          </Text>
          <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
            Autor: Lukáš Černík
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingTextGroup: {
    flex: 1,
    paddingRight: 10,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  workshopInputBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  btnIcon: {
    marginRight: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
  },
  aboutBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginTop: 2,
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  aboutText: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
});
