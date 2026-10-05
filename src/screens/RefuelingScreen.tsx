import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export const RefuelingScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [tripDistance, setTripDistance] = useState('150');
  const avgConsumption = 6.4; // l/100 km
  const fuelPricePerLiter = 38.5; // CZK/l

  const costPerKm = ((avgConsumption / 100) * fuelPricePerLiter).toFixed(2);
  const parsedDistance = parseFloat(tripDistance) || 0;
  const estimatedTripCost = ((parsedDistance * avgConsumption * fuelPricePerLiter) / 100).toFixed(0);

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Tankování & Náklady</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Správa spotřeby a provozních nákladů
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Metrics Overview */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="speedometer-outline" size={22} color={theme.accent} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>6.4 l</Text>
            <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Průměrná spotřeba</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cash-outline" size={22} color={theme.success} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>{costPerKm} Kč</Text>
            <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Náklad na 1 km</Text>
          </View>
        </View>

        {/* Route Planner Calculator */}
        <View style={[styles.calculatorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.calcHeader}>
            <Ionicons name="calculator-outline" size={20} color={theme.accent} />
            <Text style={[styles.calcTitle, { color: theme.textPrimary }]}>Kalkulačka nákladů na trasu</Text>
          </View>
          <Text style={[styles.calcDesc, { color: theme.textSecondary }]}>
            Zadejte plánovanou vzdálenost pro výpočet odhadu ceny paliva:
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              keyboardType="numeric"
              value={tripDistance}
              onChangeText={setTripDistance}
              placeholder="Vzdálenost"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.unitText, { color: theme.textSecondary }]}>km</Text>
          </View>

          <View style={[styles.calcResult, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Odhadovaná cena trasy:</Text>
            <Text style={[styles.resultValue, { color: theme.accent }]}>{estimatedTripCost} Kč</Text>
          </View>
        </View>

        {/* Recent Refueling History */}
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>Poslední záznamy tankování</Text>
        </View>

        <View style={[styles.recordCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.recordLeft}>
            <View style={[styles.fuelIconBg, { backgroundColor: theme.accent + '20' }]}>
              <Ionicons name="water" size={20} color={theme.accent} />
            </View>
            <View>
              <Text style={[styles.recordDate, { color: theme.textPrimary }]}>2. 10. 2026</Text>
              <Text style={[styles.recordMeta, { color: theme.textSecondary }]}>
                184 210 km • 42.10 l (Plná nádrž)
              </Text>
            </View>
          </View>
          <View style={styles.recordRight}>
            <Text style={[styles.recordAmount, { color: theme.textPrimary }]}>1 620 Kč</Text>
            <Text style={[styles.recordRate, { color: theme.textSecondary }]}>38.50 Kč/l</Text>
          </View>
        </View>

        <View style={[styles.recordCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.recordLeft}>
            <View style={[styles.fuelIconBg, { backgroundColor: theme.accent + '20' }]}>
              <Ionicons name="water" size={20} color={theme.accent} />
            </View>
            <View>
              <Text style={[styles.recordDate, { color: theme.textPrimary }]}>18. 9. 2026</Text>
              <Text style={[styles.recordMeta, { color: theme.textSecondary }]}>
                183 560 km • 41.50 l (Plná nádrž)
              </Text>
            </View>
          </View>
          <View style={styles.recordRight}>
            <Text style={[styles.recordAmount, { color: theme.textPrimary }]}>1 598 Kč</Text>
            <Text style={[styles.recordRate, { color: theme.textSecondary }]}>38.50 Kč/l</Text>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  statDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  calculatorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  calcTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  calcDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  unitText: {
    fontSize: 15,
    fontWeight: '600',
  },
  calcResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  historyHeader: {
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fuelIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordDate: {
    fontSize: 15,
    fontWeight: '700',
  },
  recordMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  recordRate: {
    fontSize: 12,
    marginTop: 2,
  },
});
