import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  StatusCard,
  CzechPlateInput,
  DateFormattedInput,
  OdometerFormattedInput,
  isValidDate,
  parseOdometer,
  isoToCzechDate,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { VehicleService } from '../services/vehicles';
import { Vehicle } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_CAR_YEAR = 1900;
const MAX_CAR_YEAR = CURRENT_YEAR + 1;

export const GarageScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add vehicle modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [stkDate, setStkDate] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setBrand('');
    setModel('');
    setYear('');
    setEngineCode('');
    setLicensePlate('');
    setOdometer('');
    setStkDate('');
    setInsuranceDate('');
  };

  const handleYearChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);

    if (!digits) {
      setYear('');
      return;
    }

    // Only allow starting with 1 or 2 (valid automotive eras: 19xx or 20xx)
    if (!['1', '2'].includes(digits[0])) {
      return;
    }

    // If starting with 1, second digit must be 9 (19xx)
    if (digits[0] === '1' && digits.length >= 2 && digits[1] !== '9') {
      return;
    }

    // If starting with 2, second digit must be 0 (20xx)
    if (digits[0] === '2' && digits.length >= 2 && digits[1] !== '0') {
      return;
    }

    setYear(digits);
  };

  const parsedYearNumber = year.length === 4 ? parseInt(year, 10) : null;
  const isYearInvalid =
    parsedYearNumber !== null && (parsedYearNumber < MIN_CAR_YEAR || parsedYearNumber > MAX_CAR_YEAR);

  const loadVehicles = useCallback(async () => {
    if (!user) return;
    try {
      const list = await VehicleService.getVehicles(user.id);
      setVehicles(list);
      if (list.length > 0) {
        setSelectedVehicle((prev) => (prev && list.some((v) => v.id === prev.id) ? prev : list[0]));
      } else {
        setSelectedVehicle(null);
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    Alert.alert(
      'Smazat vozidlo',
      `Opravdu si přejete odstranit vozidlo ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate}) z garáže?`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            const ok = await VehicleService.deleteVehicle(vehicle.id);
            if (ok) {
              setSelectedVehicle(null);
              await loadVehicles();
            } else {
              Alert.alert('Chyba', 'Nepodařilo se smazat vozidlo.');
            }
          },
        },
      ]
    );
  };

  const handleAddVehicle = async () => {
    if (!brand.trim() || !model.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím značku a model vozidla.');
      return;
    }

    const cleanPlate = licensePlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) {
      Alert.alert('Chyba', 'Zadejte prosím státní poznávací značku (SPZ).');
      return;
    }

    if (cleanPlate.length < 5) {
      Alert.alert('Neplatná SPZ', 'Zadejte prosím platnou českou SPZ (standardně 7 kolonek, na přání max. 8 kolonek).');
      return;
    }

    if (stkDate.trim() && !isValidDate(stkDate.trim())) {
      Alert.alert(
        'Neplatné datum STK',
        'Zadejte prosím platné kalendářní datum ve formátu DD.MM.RRRR (např. 24.11.2026) nebo pole vymažte.'
      );
      return;
    }

    if (insuranceDate.trim() && !isValidDate(insuranceDate.trim())) {
      Alert.alert(
        'Neplatné datum pojištění',
        'Zadejte prosím platné kalendářní datum ve formátu DD.MM.RRRR (např. 31.12.2026) nebo pole vymažte.'
      );
      return;
    }

    const cleanYear = year.trim();
    if (!cleanYear) {
      Alert.alert('Chyba', 'Zadejte prosím rok výroby vozidla (např. 2019).');
      return;
    }

    if (cleanYear.length !== 4) {
      Alert.alert('Neplatný rok výroby', 'Zadejte prosím kompletní 4místný rok výroby (např. 2019).');
      return;
    }

    const parsedYear = parseInt(cleanYear, 10);
    if (isNaN(parsedYear) || parsedYear < MIN_CAR_YEAR || parsedYear > MAX_CAR_YEAR) {
      Alert.alert(
        'Neplatný rok výroby',
        `Rok výroby musí být reálný rok v rozmezí ${MIN_CAR_YEAR} až ${MAX_CAR_YEAR}.`
      );
      return;
    }

    if (!user) return;

    setIsSaving(true);
    try {
      const parsedOdo = parseOdometer(odometer);

      // Standard CZ license plate has 7 chars formatted with a space (e.g. 1AB 2345)
      const formattedPlate =
        cleanPlate.length === 7
          ? `${cleanPlate.slice(0, 3)} ${cleanPlate.slice(3)}`
          : cleanPlate;

      const res = await VehicleService.addVehicle({
        ownerId: user.id,
        brand: brand.trim(),
        model: model.trim(),
        year: parsedYear,
        engineCode: engineCode.trim() || 'Standard',
        fuelType: 'petrol',
        currentOdometer: parsedOdo,
        licensePlate: formattedPlate,
        stkExpirationDate: stkDate.trim() || undefined,
        insuranceExpirationDate: insuranceDate.trim() || undefined,
        oilIntervalKm: 15000,
        lastOilChangeKm: parsedOdo,
      });

      if (res.error) {
        Alert.alert('Chyba', res.error);
      } else if (res.vehicle) {
        resetForm();
        setModalVisible(false);
        await loadVehicles();
        setSelectedVehicle(res.vehicle);
        Alert.alert('Úspěch', 'Vozidlo bylo úspěšně přidáno do garáže.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const currentCar = selectedVehicle || vehicles[0];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Ambient background glows */}
      <View pointerEvents="none" style={[styles.ambientTopGlow, { backgroundColor: theme.ambientGlowPrimary }]} />
      <View pointerEvents="none" style={[styles.ambientRightGlow, { backgroundColor: theme.ambientGlowSecondary }]} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF018F" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              Vítej zpět, {user?.displayName?.split(' ')[0] || 'Řidiči'}
            </Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Moje Garáž</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 40 }} />
        ) : currentCar ? (
          <>
            {/* Primary Vehicle Hero Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  shadowColor: theme.shadowColor,
                  shadowOpacity: theme.shadowOpacity,
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.vehicleBrand, { color: theme.accent }]}>Aktivní vozidlo</Text>
                  <Text style={[styles.vehicleName, { color: theme.textPrimary }]}>
                    {currentCar.brand} {currentCar.model}
                  </Text>
                  <Text style={[styles.vehicleMeta, { color: theme.textSecondary }]}>
                    R.v. {currentCar.year} • Motor {currentCar.engineCode} • {currentCar.fuelType}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View
                    style={[
                      styles.licensePlate,
                      {
                        borderColor: isDark ? '#334155' : '#CBD5E1',
                        backgroundColor: isDark ? '#121118' : '#FFFFFF',
                      },
                    ]}
                  >
                    <View style={styles.euBand}>
                      <Text style={styles.euText}>CZ</Text>
                    </View>
                    <Text style={[styles.plateText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                      {currentCar.licensePlate}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteVehicle(currentCar)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}
                  >
                    <Ionicons name="trash-outline" size={13} color={theme.danger} />
                    <Text style={{ fontSize: 11, color: theme.danger, fontWeight: '600' }}>Smazat</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.statsRow, { borderTopColor: theme.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Tachometr</Text>
                  <Text style={[styles.statValue, { color: theme.textPrimary }]}>
                    {currentCar.currentOdometer.toLocaleString('cs-CZ')} km
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Platnost STK</Text>
                  <Text style={[styles.statValue, { color: theme.warning }]}>
                    {isoToCzechDate(currentCar.stkExpirationDate) || 'Nenastaveno'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Výměna oleje</Text>
                  <Text style={[styles.statValue, { color: theme.success }]}>
                    za {(currentCar.oilIntervalKm - (currentCar.currentOdometer - currentCar.lastOilChangeKm)).toLocaleString('cs-CZ')} km
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Overview */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Rychlý přehled stavu</Text>
            </View>

            <StatusCard
              title="Stav vozidla"
              value="V pořádku"
              subtitle="Bez zaznamenaných chyb v systému"
            />

            <StatusCard
              title="Průměrná spotřeba"
              value="Zatím nespočteno"
              subtitle="Vyžaduje alespoň dvě tankování"
            />

            <StatusCard
              title="Pojištění vozidla"
              value={currentCar.insuranceExpirationDate ? `Platné do ${isoToCzechDate(currentCar.insuranceExpirationDate)}` : 'Nenastaveno'}
              subtitle="Povinné ručení"
            />

            {/* Vehicle Selector (if more than 1) */}
            {vehicles.length > 1 && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 8 }]}>
                  Další vozy v garáži ({vehicles.length})
                </Text>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.vehicleRow,
                      {
                        backgroundColor: theme.card,
                        borderColor: v.id === currentCar.id ? theme.accent : theme.cardBorder,
                      },
                    ]}
                    onPress={() => setSelectedVehicle(v)}
                  >
                    <Ionicons name="car-sport" size={20} color={v.id === currentCar.id ? theme.accent : theme.textSecondary} />
                    <Text style={[styles.vehicleRowName, { color: theme.textPrimary }]}>
                      {v.brand} {v.model} ({v.licensePlate})
                    </Text>
                    {v.id === currentCar.id && (
                      <Ionicons name="checkmark-circle" size={18} color={theme.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Přidat další vozidlo do garáže</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>V garáži zatím nemáte žádné vozidlo.</Text>
            <TouchableOpacity
              style={[styles.emptyActionButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>Přidat první vozidlo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Nové vozidlo do garáže</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 480 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Značka (Brand)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="např. Škoda, Volkswagen, BMW..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Model</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
                  value={model}
                  onChangeText={setModel}
                  placeholder="např. Octavia, Golf, 320d..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    Rok výroby *
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: isYearInvalid ? '#EF4444' : theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    value={year}
                    onChangeText={handleYearChange}
                    placeholder="např. 2019"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                  {isYearInvalid ? (
                    <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>
                      Platný rok: {MIN_CAR_YEAR}–{MAX_CAR_YEAR}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Kód motoru</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.textPrimary }]}
                    value={engineCode}
                    onChangeText={setEngineCode}
                    placeholder="např. 2.0 TDI, 1.5 TSI..."
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Státní poznávací značka (SPZ) *
                </Text>
                <CzechPlateInput
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  theme={theme}
                  isDark={isDark}
                />
              </View>

              <OdometerFormattedInput
                label="Aktuální stav tachometru"
                value={odometer}
                onChangeText={setOdometer}
                theme={theme}
                isDark={isDark}
                placeholder="např. 145 000"
              />

              <DateFormattedInput
                label="Platnost STK (volitelné)"
                value={stkDate}
                onChangeDate={setStkDate}
                theme={theme}
                isDark={isDark}
                presets={[
                  { label: '+2 roky (Standard ČR)', addYears: 2 },
                  { label: '+4 roky (Nové auto)', addYears: 4 },
                ]}
              />

              <DateFormattedInput
                label="Platnost pojištění (volitelné)"
                value={insuranceDate}
                onChangeDate={setInsuranceDate}
                theme={theme}
                isDark={isDark}
                presets={[
                  { label: '+1 rok (Roční)', addYears: 1 },
                  { label: 'Dnes', isToday: true },
                ]}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent }]}
              onPress={handleAddVehicle}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Uložit vozidlo</Text>
              )}
            </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  greeting: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.2,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: '#FF018F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#332352',
    backgroundColor: 'rgba(24, 20, 34, 0.95)',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#2A0C62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleBrand: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#FF018F',
  },
  vehicleName: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  vehicleMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  licensePlate: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 4,
  },
  euBand: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 4,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  euText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  plateText: {
    fontWeight: '800',
    fontSize: 13,
    paddingHorizontal: 8,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  vehicleRowName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 24,
    marginTop: 16,
    width: '100%',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    marginTop: 18,
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    marginVertical: 16,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  saveButton: {
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
