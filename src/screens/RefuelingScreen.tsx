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
import { FuelService } from '../services/records';
import { FuelEntry } from '../types';

export const RefuelingScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
        }
      >
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
            onPress={openAddModal}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Metrics Overview */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="speedometer-outline" size={22} color={theme.accent} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>
              {calculatedAvgConsumption !== null ? `${calculatedAvgConsumption.toFixed(1)} l` : '—'}
            </Text>
            <Text style={[styles.statDesc, { color: theme.textSecondary }]}>
              {entries.length >= 2 ? 'Průměrná spotřeba' : 'Vyžaduje alespoň 2 tankování'}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="cash-outline" size={22} color={theme.success} />
            <Text style={[styles.statVal, { color: theme.textPrimary }]}>
              {calculatedCostPerKm !== '—' ? `${calculatedCostPerKm} Kč` : '—'}
            </Text>
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
              placeholder="např. 150"
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={[styles.unitText, { color: theme.textSecondary }]}>km</Text>
          </View>

          <View style={[styles.calcResult, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Odhadovaná cena trasy:</Text>
            <Text style={[styles.resultValue, { color: theme.accent }]}>
              {effectiveConsumption > 0 ? `${estimatedTripCost} Kč` : 'Zatím nespočteno'}
            </Text>
          </View>
        </View>

        {/* Recent Refueling History */}
        <View style={styles.historyHeader}>
          <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
            Záznamy tankování {entries.length > 0 ? `(${entries.length})` : ''}
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 20 }} />
        ) : entries.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="water-outline" size={40} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Žádné záznamy o tankování</Text>
            <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
              Zatím nemáte zaznamenané žádné tankování. Klepnutím na tlačítko + výše přidejte svůj první záznam.
            </Text>
          </View>
        ) : (
          entries.map((item) => (
            <View
              key={item.id}
              style={[styles.recordCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={styles.recordLeft}>
                <View style={[styles.fuelIconBg, { backgroundColor: theme.accent + '20' }]}>
                  <Ionicons name="water" size={20} color={theme.accent} />
                </View>
                <View>
                  <Text style={[styles.recordDate, { color: theme.textPrimary }]}>{item.date}</Text>
                  <Text style={[styles.recordMeta, { color: theme.textSecondary }]}>
                    {item.odometer.toLocaleString('cs-CZ')} km • {item.liters.toFixed(1)} l{' '}
                    {item.isFullTank ? '(Plná nádrž)' : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.recordRightRow}>
                <View style={styles.recordRight}>
                  <Text style={[styles.recordAmount, { color: theme.textPrimary }]}>
                    {item.priceTotalCzK.toLocaleString('cs-CZ')} Kč
                  </Text>
                  <Text style={[styles.recordRate, { color: theme.textSecondary }]}>
                    {item.pricePerLiter.toFixed(2)} Kč/l
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteEntry(item.id)}
                  hitSlop={10}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
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
                  onChangeText={setEntryDate}
                  placeholder="např. 12. 10. 2026"
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
                  onChangeText={setEntryOdometer}
                  keyboardType="numeric"
                  placeholder="např. 184500"
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
                style={[styles.modalButtonCancel, { borderColor: theme.border }]}
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
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
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
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  recordRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  deleteButton: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    padding: 20,
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
