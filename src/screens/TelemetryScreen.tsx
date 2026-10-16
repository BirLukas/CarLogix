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
      {/* Ambient background glows */}
      {!isHudMode && (
        <>
          <View style={styles.ambientTopGlow} pointerEvents="none" />
          <View style={styles.ambientRightGlow} pointerEvents="none" />
        </>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Mode Bar */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandTag}>CARLOGIX • TELEMETRIE</Text>
            </View>
            <Text style={[styles.title, { color: isHudMode ? '#FFFFFF' : theme.textPrimary }]}>
              OBD-II HUD Cluster
            </Text>
            <Text style={[styles.subtitle, { color: isHudMode ? '#9CA3AF' : theme.textSecondary }]}>
              {isSimulating ? '• Simulační režim (Pololetní demo)' : '• BLE Vgate iCar Pro (Aktivní)'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.hudButton,
                {
                  backgroundColor: isHudMode ? theme.neonPink : theme.surface,
                  borderColor: isHudMode ? theme.neonPink : theme.cardBorder,
                },
                isHudMode && styles.hudButtonActiveGlow,
              ]}
              onPress={() => setIsHudMode(!isHudMode)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="contrast"
                size={16}
                color={isHudMode ? '#FFFFFF' : theme.neonPink}
              />
              <Text
                style={[
                  styles.hudButtonText,
                  { color: isHudMode ? '#FFFFFF' : theme.textPrimary },
                ]}
              >
                HUD REŽIM
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* HUD Mode Alert / Note */}
        {isHudMode && (
          <View style={styles.hudBanner}>
            <Ionicons name="sparkles" size={14} color="#FF018F" />
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
                  backgroundColor: isHudMode ? '#0B0A12' : theme.surface,
                  borderColor: isHudMode ? theme.neonPink : theme.cardBorder,
                },
                styles.gaugeCardGlow,
              ]}
            >
              <View style={styles.gaugeHeaderRow}>
                <Ionicons name="speedometer-outline" size={14} color={theme.neonPink} />
                <Text style={[styles.gaugeLabel, { color: theme.neonPink }]}>
                  RYCHLOST
                </Text>
              </View>
              <Text style={[styles.gaugeBigValue, { color: isHudMode ? '#FFFFFF' : theme.textPrimary }]}>
                {metrics.speed}
              </Text>
              <Text style={[styles.gaugeUnit, { color: theme.textSecondary }]}>
                KM / H
              </Text>
            </View>

            <View
              style={[
                styles.gaugeCard,
                {
                  backgroundColor: isHudMode ? '#0B0A12' : theme.surface,
                  borderColor: isHudMode ? theme.neonPink : theme.cardBorder,
                },
                styles.gaugeCardGlow,
              ]}
            >
              <View style={styles.gaugeHeaderRow}>
                <Ionicons name="flash-outline" size={14} color={theme.neonPink} />
                <Text style={[styles.gaugeLabel, { color: theme.neonPink }]}>
                  OTÁČKY MOTORU
                </Text>
              </View>
              <Text style={[styles.gaugeBigValue, { color: isHudMode ? '#FFFFFF' : theme.textPrimary }]}>
                {metrics.rpm}
              </Text>
              <Text style={[styles.gaugeUnit, { color: theme.textSecondary }]}>
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
                  backgroundColor: isHudMode ? '#0B0A12' : theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Ionicons name="thermometer-outline" size={16} color={theme.neonPink} />
              <Text style={[styles.miniGaugeLabel, { color: theme.textSecondary }]}>Chladivo</Text>
              <Text style={[styles.miniGaugeVal, { color: metrics.coolantTemp > 95 ? theme.danger : theme.textPrimary }]}>
                {metrics.coolantTemp} °C
              </Text>
            </View>

            <View
              style={[
                styles.miniGaugeCard,
                {
                  backgroundColor: isHudMode ? '#0B0A12' : theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Ionicons name="water-outline" size={16} color={theme.neonPink} />
              <Text style={[styles.miniGaugeLabel, { color: theme.textSecondary }]}>Spotřeba</Text>
              <Text style={[styles.miniGaugeVal, { color: theme.textPrimary }]}>
                {metrics.currentConsumptionLPer100Km?.toFixed(1) || '0.0'} l
              </Text>
            </View>

            <View
              style={[
                styles.miniGaugeCard,
                {
                  backgroundColor: isHudMode ? '#0B0A12' : theme.surface,
                  borderColor: theme.cardBorder,
                },
              ]}
            >
              <Ionicons name="nuclear-outline" size={16} color={theme.neonPink} />
              <Text style={[styles.miniGaugeLabel, { color: theme.textSecondary }]}>MAF Tok</Text>
              <Text style={[styles.miniGaugeVal, { color: theme.textPrimary }]}>
                {metrics.mafAirFlow?.toFixed(1) || '0.0'} g/s
              </Text>
            </View>
          </View>
        </View>

        {/* Simulation toggle bar */}
        {!isHudMode && (
          <View style={[styles.simControlCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.simTitle, { color: theme.textPrimary }]}>Zdroj telemetrie</Text>
              <Text style={[styles.simDesc, { color: theme.textSecondary }]}>
                {isSimulating ? 'Generátor reálných hodnot pro testování' : 'Čtení ze sériové linky ELM327'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.simToggleBtn, { backgroundColor: isSimulating ? theme.deepViolet : theme.neonPink }]}
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
  ambientTopGlow: {
    position: 'absolute',
    top: -60,
    left: '20%',
    width: 200,
    height: 160,
    borderRadius: 100,
    backgroundColor: '#2A0C62',
    opacity: 0.45,
  },
  ambientRightGlow: {
    position: 'absolute',
    top: 140,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#FF018F',
    opacity: 0.15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandRow: {
    marginBottom: 4,
  },
  brandTag: {
    color: '#FF018F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
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
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  hudButtonActiveGlow: {
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  hudButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2A0C6240',
    borderColor: '#FF018F',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  hudBannerText: {
    color: '#FF018F',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  gaugesContainer: {
    gap: 16,
    marginBottom: 16,
  },
  hudMirror: {
    transform: [{ scaleX: -1 }],
  },
  dualGaugeRow: {
    flexDirection: 'row',
    gap: 14,
  },
  gaugeCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
  },
  gaugeCardGlow: {
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
  },
  gaugeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gaugeLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  gaugeBigValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  gaugeUnit: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  tripleGaugeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniGaugeCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  miniGaugeLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  miniGaugeVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  simControlCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  simTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  simDesc: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  simToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  simToggleText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});

