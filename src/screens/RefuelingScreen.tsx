import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
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
import { Colors } from '../constants/theme';
import { formatLogicalDate, formatOdometer } from '../components';
import { FuelService } from '../services/records';
import { FuelEntry } from '../types';

export const RefuelingScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Route calculator state
  const [tripDistance, setTripDistance] = useState('');

  // Add Refueling Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [entryDate, setEntryDate] = useState('');
  const [entryOdometer, setEntryOdometer] = useState('');
  const [entryLiters, setEntryLiters] = useState('');
  const [entryTotalPrice, setEntryTotalPrice] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      const data = await FuelService.getEntries();
      setEntries(data);
    } catch (err) {
      console.error('Chyba při načítání záznamů o tankování:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  const getTodayFormatted = () => {
    const today = new Date();
    return `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`;
  };

  const openAddModal = () => {
    setEntryDate(getTodayFormatted());
    setEntryOdometer('');
    setEntryLiters('');
    setEntryTotalPrice('');
    setIsFullTank(true);
    setModalVisible(true);
  };

  const handleSaveEntry = async () => {
    const odo = parseInt(entryOdometer.replace(/\s/g, ''), 10);
    const liters = parseFloat(entryLiters.replace(',', '.'));
    const price = parseFloat(entryTotalPrice.replace(/\s/g, '').replace(',', '.'));

    if (isNaN(odo) || odo <= 0) {
      Alert.alert('Chyba', 'Zadejte platný stav tachometru.');
      return;
    }
    if (isNaN(liters) || liters <= 0) {
      Alert.alert('Chyba', 'Zadejte platné množství natankovaných litrů.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      Alert.alert('Chyba', 'Zadejte platnou celkovou cenu.');
      return;
    }

    const pricePerLiter = parseFloat((price / liters).toFixed(2));

    setIsSaving(true);
    try {
      await FuelService.addEntry({
        date: entryDate.trim() || getTodayFormatted(),
        odometer: odo,
        liters,
        priceTotalCzK: Math.round(price),
        pricePerLiter,
        isFullTank,
      });
      setModalVisible(false);
      loadEntries();
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit záznam.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert('Smazat záznam', 'Opravdu chcete tento záznam o tankování odstranit?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          await FuelService.deleteEntry(id);
          loadEntries();
        },
      },
    ]);
  };

  // Dynamic metrics calculation
  let calculatedAvgConsumption: number | null = null;
  let calculatedCostPerKm: string = '—';
  let avgPricePerLiter = 0;

  if (entries.length > 0) {
    const totalSpent = entries.reduce((acc, curr) => acc + curr.priceTotalCzK, 0);
    const totalLiters = entries.reduce((acc, curr) => acc + curr.liters, 0);
    avgPricePerLiter = totalLiters > 0 ? totalSpent / totalLiters : 0;

    if (entries.length >= 2) {
      // Sort ascending by odometer
      const sorted = [...entries].sort((a, b) => a.odometer - b.odometer);
      const minOdo = sorted[0].odometer;
      const maxOdo = sorted[sorted.length - 1].odometer;
      const distance = maxOdo - minOdo;

      if (distance > 0) {
        // Refuels between min and max odometer
        const subsequentLiters = sorted.slice(1).reduce((acc, curr) => acc + curr.liters, 0);
        calculatedAvgConsumption = (subsequentLiters / distance) * 100;
        const subsequentCost = sorted.slice(1).reduce((acc, curr) => acc + curr.priceTotalCzK, 0);
        calculatedCostPerKm = (subsequentCost / distance).toFixed(2);
      }
    }
  }

  // Route cost calculation
  const parsedDistance = parseFloat(tripDistance.replace(',', '.')) || 0;
  const effectiveConsumption = calculatedAvgConsumption || 0;
  const effectiveFuelPrice = avgPricePerLiter || 38.5;
  const estimatedTripCost =
    effectiveConsumption > 0
      ? ((parsedDistance * effectiveConsumption * effectiveFuelPrice) / 100).toFixed(0)
      : '0';

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Ambient background glows */}
      <View pointerEvents="none" style={[styles.ambientTopGlow, { backgroundColor: theme.ambientGlowPrimary }]} />
      <View pointerEvents="none" style={[styles.ambientRightGlow, { backgroundColor: theme.ambientGlowSecondary }]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF018F" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandTagRow}>
              <Text style={styles.brandTag}>CARLOGIX</Text>
              <View style={styles.brandTagDot} />
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Tankování & Náklady</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Správa spotřeby a provozních nákladů
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.85}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Metrics Overview Grid */}
        <View style={styles.statsGrid}>
          {/* KPI Card 1: Průměrná spotřeba */}
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadowColor,
                shadowOpacity: theme.shadowOpacity,
              },
            ]}
          >
            <View style={styles.statBoxTop}>
              <View style={[styles.statIconBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                <Ionicons name="speedometer-outline" size={20} color="#FF018F" />
              </View>
              <View style={[styles.kpiChipPink, { backgroundColor: isDark ? 'rgba(255, 1, 143, 0.15)' : 'rgba(255, 1, 143, 0.1)' }]}>
                <Text style={styles.kpiChipTextPink}>PRŮMĚR</Text>
              </View>
            </View>
            <View style={styles.kpiValRow}>
              <Text style={[styles.statVal, { color: theme.textPrimary }]}>
                {calculatedAvgConsumption !== null ? calculatedAvgConsumption.toFixed(1) : '57.1'}
              </Text>
              <Text style={styles.kpiValUnitPink}>l</Text>
            </View>
            <Text style={[styles.statDesc, { color: theme.textSecondary }]}>
              {entries.length >= 2 ? 'Průměrná spotřeba' : 'Průměrná spotřeba'}
            </Text>
          </View>

          {/* KPI Card 2: Náklad na 1 km */}
          <View
            style={[
              styles.statBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadowColor,
                shadowOpacity: theme.shadowOpacity,
              },
            ]}
          >
            <View style={styles.statBoxTop}>
              <View style={[styles.statIconBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                <Ionicons name="cash-outline" size={20} color="#FF018F" />
              </View>
              <View style={[styles.kpiChipGreen, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)' }]}>
                <Text style={[styles.kpiChipTextGreen, { color: isDark ? '#34D399' : '#059669' }]}>EFEKTIVITA</Text>
              </View>
            </View>
            <View style={styles.kpiValRow}>
              <Text style={[styles.statVal, { color: theme.textPrimary }]}>
                {calculatedCostPerKm !== '—' ? calculatedCostPerKm : '22.86'}
              </Text>
              <Text style={styles.kpiValUnitPink}>Kč</Text>
            </View>
            <Text style={[styles.statDesc, { color: theme.textSecondary }]}>Náklad na 1 km</Text>
          </View>
        </View>

        {/* Route Planner Calculator Widget */}
        <View
          style={[
            styles.calculatorCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              shadowColor: theme.shadowColor,
              shadowOpacity: theme.shadowOpacity,
            },
          ]}
        >
          <View style={styles.calcHeader}>
            <View style={[styles.calcIconBadge, { backgroundColor: theme.badgeBg }]}>
              <Ionicons name="calculator-outline" size={17} color="#FF018F" />
            </View>
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
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              keyboardType="numeric"
              value={tripDistance}
              onChangeText={setTripDistance}
              placeholder="např. 150"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.unitText, { color: theme.textSecondary }]}>KM</Text>
          </View>

          <View
            style={[
              styles.calcResult,
              {
                backgroundColor: isDark ? 'rgba(42, 12, 98, 0.65)' : 'rgba(255, 1, 143, 0.08)',
                borderColor: isDark ? 'rgba(255, 1, 143, 0.25)' : 'rgba(255, 1, 143, 0.2)',
              },
            ]}
          >
            <Text style={[styles.resultLabel, { color: theme.textPrimary }]}>Odhadovaná cena trasy:</Text>
            <Text style={styles.resultValue}>
              {effectiveConsumption > 0 ? `${estimatedTripCost} Kč` : '0 Kč'}
            </Text>
          </View>
        </View>

        {/* Recent Refueling History Header */}
        <View style={styles.historyHeader}>
          <View style={styles.historyTitleRow}>
            <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
              Záznamy tankování
            </Text>
            <View style={[styles.countBadge, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
              <Text style={styles.countBadgeText}>{entries.length}</Text>
            </View>
          </View>
          <Text style={[styles.historySub, { color: theme.textSecondary }]}>Poslední aktivita</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#FF018F" style={{ marginTop: 20 }} />
        ) : entries.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
                shadowColor: theme.shadowColor,
                shadowOpacity: theme.shadowOpacity,
              },
            ]}
          >
            <Ionicons name="water-outline" size={40} color="#FF018F" />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Žádné záznamy o tankování</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Zatím nemáte zaznamenané žádné tankování. Klepnutím na tlačítko + výše přidejte svůj první záznam.
            </Text>
          </View>
        ) : (
          entries.map((item) => (
            <View
              key={item.id}
              style={[
                styles.recordCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.shadowColor,
                  shadowOpacity: theme.shadowOpacity,
                },
              ]}
            >
              <View style={styles.recordLeft}>
                <View style={[styles.fuelIconBg, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                  <Ionicons name="water" size={20} color="#FF018F" />
                </View>
                <View style={styles.recordMetaCol}>
                  <Text style={[styles.recordDate, { color: theme.textPrimary }]}>{item.date}</Text>
                  <Text style={[styles.recordMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.odometer.toLocaleString('cs-CZ')} km • {item.liters.toFixed(1)} l {item.isFullTank ? '(Plná nádrž)' : ''} • {item.pricePerLiter.toFixed(2)} Kč/l
                  </Text>
                </View>
              </View>
              <View style={styles.recordRightRow}>
                <Text style={[styles.recordAmount, { color: theme.textPrimary }]}>
                  {item.priceTotalCzK.toLocaleString('cs-CZ')} Kč
                </Text>
                <TouchableOpacity
                  onPress={() => handleDeleteEntry(item.id)}
                  hitSlop={10}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal: Přidat tankování */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Přidat záznam tankování</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Datum</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={entryDate}
                  onChangeText={(t) => setEntryDate(formatLogicalDate(t, entryDate))}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="např. 12.10.2026"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Stav tachometru (km)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={entryOdometer}
                  onChangeText={(t) => setEntryOdometer(formatOdometer(t))}
                  keyboardType="number-pad"
                  placeholder="např. 184 500"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Natankováno (litry)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={entryLiters}
                  onChangeText={setEntryLiters}
                  keyboardType="numeric"
                  placeholder="např. 42.5"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Celková cena (Kč)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={entryTotalPrice}
                  onChangeText={setEntryTotalPrice}
                  keyboardType="numeric"
                  placeholder="např. 1650"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={[styles.switchLabel, { color: theme.textPrimary }]}>Plná nádrž</Text>
                  <Text style={[styles.switchSub, { color: theme.textSecondary }]}>
                    Důležité pro přesný výpočet spotřeby
                  </Text>
                </View>
                <Switch
                  value={isFullTank}
                  onValueChange={setIsFullTank}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
                onPress={() => setModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={[styles.modalButtonCancelText, { color: theme.textSecondary }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSubmit, { backgroundColor: theme.accent }]}
                onPress={handleSaveEntry}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>Uložit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    left: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(42, 12, 98, 0.45)',
  },
  ambientRightGlow: {
    position: 'absolute',
    top: '30%',
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 1, 143, 0.12)',
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
  brandTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandTag: {
    color: '#FF018F',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  brandTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 1, 143, 0.7)',
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 2,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: 'rgba(24, 20, 34, 0.85)',
    padding: 14,
  },
  statBoxTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 12, 98, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 1, 143, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiChipPink: {
    backgroundColor: 'rgba(255, 1, 143, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  kpiChipTextPink: {
    color: '#FF018F',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kpiChipGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  kpiChipTextGreen: {
    color: '#34D399',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  kpiValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statVal: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  kpiValUnitPink: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF018F',
  },
  statDesc: {
    fontSize: 11.5,
    marginTop: 4,
    color: '#9CA3AF',
  },
  calculatorCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: 'rgba(24, 20, 34, 0.85)',
    padding: 16,
    marginBottom: 18,
  },
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  calcIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 1, 143, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calcTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calcDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 17,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  textInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#121118',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingRight: 40,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unitText: {
    position: 'absolute',
    right: 14,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  calcResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 12, 98, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 1, 143, 0.25)',
  },
  resultLabel: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#D1D5DB',
  },
  resultValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FF018F',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: 'rgba(42, 12, 98, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 1, 143, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    color: '#FF018F',
    fontSize: 11,
    fontWeight: '800',
  },
  historySub: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#161320',
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  recordCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#161320',
    padding: 14,
    marginBottom: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  fuelIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(42, 12, 98, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 1, 143, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordMetaCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  recordDate: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  recordMeta: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 2,
  },
  recordRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordAmount: {
    fontSize: 15.5,
    fontWeight: '800',
  },
  deleteButton: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#181622',
    maxHeight: '85%',
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
  },
  modalBody: {
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#121118',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2242',
    backgroundColor: '#121118',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalButtonSubmit: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  modalButtonSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
