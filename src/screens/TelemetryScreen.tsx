import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { OBDService } from '../services/obd';
import { OBDLiveMetrics } from '../types';

export const TelemetryScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [isHudMode, setIsHudMode] = useState(false);
  const [metrics, setMetrics] = useState<OBDLiveMetrics>(OBDService.getSimulatedMetrics());
  const [isSimulating, setIsSimulating] = useState(true);

  // Update telemetry metrics periodically in simulation mode
  useEffect(() => {
    let interval: any = null;
    if (isSimulating) {
      interval = setInterval(() => {
        setMetrics(OBDService.getSimulatedMetrics());
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating]);

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        { backgroundColor: isHudMode ? '#000000' : theme.background },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Mode Bar */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: isHudMode ? '#FFFFFF' : theme.textPrimary }]}>
              OBD-II Telemetrie
            </Text>
            <Text style={[styles.subtitle, { color: isHudMode ? '#94A3B8' : theme.textSecondary }]}>
              {isSimulating ? '• Simulační režim (Pololetní demo)' : '• BLE Vgate iCar Pro'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.hudButton,
                { backgroundColor: isHudMode ? theme.accent : theme.surface, borderColor: theme.border },
              ]}
              onPress={() => setIsHudMode(!isHudMode)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="contrast"
                size={18}
                color={isHudMode ? '#FFFFFF' : theme.textPrimary}
              />
              <Text
                style={[
                  styles.hudButtonText,
                  { color: isHudMode ? '#FFFFFF' : theme.textPrimary },
                ]}
              >
                HUD
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* HUD Mode Alert / Note */}
        {isHudMode && (
          <View style={styles.hudBanner}>
            <Text style={styles.hudBannerText}>
              REŽIM ZRCADLENÍ (HUD) – Položte telefon na palubní desku pod čelní sklo
            </Text>
          </View>
        )}

        {/* Gauges Grid with optional mirroring */}
        <View style={[styles.gaugesContainer, isHudMode && styles.hudMirror]}>
          {/* Speed & RPM Primary Gauges */}
          <View style={styles.dualGaugeRow}>
            <View
              style={[
                styles.gaugeCard,
                {
                  backgroundColor: isHudMode ? '#0F172A' : theme.surface,
                  borderColor: isHudMode ? '#38BDF8' : theme.border,
                },
              ]}
            >
              <Text style={[styles.gaugeLabel, { color: isHudMode ? '#38BDF8' : theme.accent }]}>
                RYCHLOST
              </Text>
              <Text style={[styles.gaugeBigValue, { color: isHudMode ? '#FFFFFF' : theme.textPrimary }]}>
                {metrics.speed}
              </Text>
              <Text style={[styles.gaugeUnit, { color: isHudMode ? '#94A3B8' : theme.textSecondary }]}>
                km/h
              </Text>
            </View>

            <View
              style={[
                styles.gaugeCard,
                {
                  backgroundColor: isHudMode ? '#0F172A' : theme.surface,
                  borderColor: isHudMode ? '#38BDF8' : theme.border,
                },
              ]}
            >
              <Text style={[styles.gaugeLabel, { color: isHudMode ? '#38BDF8' : theme.accent }]}>
                OTÁČKY MOTORU
              </Text>
              <Text style={[styles.gaugeBigValue, { color: isHudMode ? '#FFFFFF' : theme.textPrimary }]}>
                {metrics.rpm}
              </Text>
              <Text style={[styles.gaugeUnit, { color: isHudMode ? '#94A3B8' : theme.textSecondary }]}>
                RPM
              </Text>
            </View>
          </View>

          {/* Secondary Telemetry: Temp & Real-time Consumption */}
          <View style={styles.tripleGaugeRow}>
            <View
              style={[
                styles.miniGaugeCard,
                {
                  backgroundColor: isHudMode ? '#0F172A' : theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.miniGaugeLabel, { color: theme.textSecondary }]}>Chladicí kap.</Text>
              <Text style={[styles.miniGaugeVal, { color: metrics.coolantTemp > 95 ? theme.danger : theme.textPrimary }]}>
                {metrics.coolantTemp} °C
              </Text>
            </View>

            <View
              style={[
                styles.miniGaugeCard,
                {
                  backgroundColor: isHudMode ? '#0F172A' : theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.miniGaugeLabel, { color: theme.textSecondary }]}>Okamžitá spotřeba</Text>
              <Text style={[styles.miniGaugeVal, { color: theme.textPrimary }]}>
                {metrics.currentConsumptionLPer100Km?.toFixed(1) || '0.0'} l/100km
              </Text>
            </View>

            <View
              style={[
                styles.miniGaugeCard,
                {
                  backgroundColor: isHudMode ? '#0F172A' : theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.miniGaugeLabel, { color: theme.textSecondary }]}>Průtok vzduchu (MAF)</Text>
              <Text style={[styles.miniGaugeVal, { color: theme.textPrimary }]}>
                {metrics.mafAirFlow?.toFixed(1) || '0.0'} g/s
              </Text>
            </View>
          </View>
        </View>

        {/* Simulation toggle bar */}
        {!isHudMode && (
          <View style={[styles.simControlCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View>
              <Text style={[styles.simTitle, { color: theme.textPrimary }]}>Zdroj telemetrie</Text>
              <Text style={[styles.simDesc, { color: theme.textSecondary }]}>
                {isSimulating ? 'Generátor reálných hodnot pro testování' : 'Čtení ze sériové linky ELM327'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.simToggleBtn, { backgroundColor: isSimulating ? theme.warning : theme.accent }]}
              onPress={() => setIsSimulating(!isSimulating)}
              activeOpacity={0.8}
            >
              <Text style={styles.simToggleText}>
                {isSimulating ? 'Pozastavit' : 'Spustit'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  hudButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  hudButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hudBanner: {
    backgroundColor: '#38BDF820',
    borderColor: '#38BDF8',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  hudBannerText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  gaugesContainer: {
    gap: 14,
    marginBottom: 16,
  },
  hudMirror: {
    transform: [{ scaleX: -1 }],
  },
  dualGaugeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gaugeCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  gaugeBigValue: {
    fontSize: 44,
    fontWeight: '900',
  },
  gaugeUnit: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  tripleGaugeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniGaugeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  miniGaugeLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  miniGaugeVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  simControlCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  simTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  simDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  simToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  simToggleText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
