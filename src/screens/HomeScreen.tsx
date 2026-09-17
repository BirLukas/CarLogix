import React from 'react';
import { SafeAreaView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { StatusCard } from '../components';
import { OBDService } from '../services/obd';

export const HomeScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const obdStatus = OBDService.getStatus();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>CarLogix</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Chytrá správa vozidla a diagnostika OBD-II
          </Text>
          <View style={[styles.badge, { backgroundColor: theme.accent }]}>
            <Text style={styles.badgeText}>v0.1.0 • Expo SDK 57</Text>
          </View>
        </View>

        <View style={styles.content}>
          <StatusCard
            title="Aktivní Téma"
            value={isDark ? 'Tmavý režim (Dark)' : 'Světlý režim (Light)'}
            subtitle="Automatické přizpůsobení systému"
          />

          <StatusCard
            title="OBD-II Telemetrie"
            value={obdStatus.adapterName || 'Nepřipojeno'}
            subtitle={obdStatus.isSimulated ? 'Aktivní simulační režim' : 'BLE 4.0 připraveno'}
          />

          <StatusCard
            title="Referenční Vozidlo"
            value="Peugeot 206 1.4i (2006)"
            subtitle="Kód motoru: KFW / TU3JP"
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            Maturitní projekt • Lukáš Černík
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    width: '100%',
    marginVertical: 20,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
  },
});
