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
import { StatusCard } from '../components';
import { useAuth } from '../context/AuthContext';
import { VehicleService } from '../services/vehicles';
import { Vehicle } from '../types';

export const GarageScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
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
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setBrand('');
    setModel('');
    setYear('');
    setEngineCode('');
    setLicensePlate('');
    setOdometer('');
  };

  const loadVehicles = useCallback(async () => {
    if (!user) return;
    try {
      const list = await VehicleService.getVehicles(user.id);
      setVehicles(list);
      if (list.length > 0) {
        setSelectedVehicle(list[0]);
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

  const handleAddVehicle = async () => {
    if (!brand.trim() || !model.trim() || !licensePlate.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím značku, model a SPZ vozidla.');
      return;
    }

    if (!user) return;

    setIsSaving(true);
    try {
      const parsedYear = parseInt(year, 10) || new Date().getFullYear();
      const parsedOdo = parseInt(odometer, 10) || 0;

      const res = await VehicleService.addVehicle({
        ownerId: user.id,
        brand: brand.trim(),
        model: model.trim(),
        year: parsedYear,
        engineCode: engineCode.trim() || 'Standard',
        fuelType: 'petrol',
        currentOdometer: parsedOdo,
        licensePlate: licensePlate.trim().toUpperCase(),
        stkExpirationDate: '2027-10-15',
        insuranceExpirationDate: '2027-12-31',
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
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
            style={[styles.avatarBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 40 }} />
        ) : currentCar ? (
          <>
            {/* Primary Vehicle Hero Card */}
            <View style={[styles.heroCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                <View style={[styles.licensePlate, { borderColor: theme.border, backgroundColor: theme.background }]}>
                  <View style={styles.euBand}>
                    <Text style={styles.euText}>CZ</Text>
                  </View>
                  <Text style={[styles.plateText, { color: theme.textPrimary }]}>
                    {currentCar.licensePlate}
                  </Text>
                </View>
              </View>

              <View style={styles.statsRow}>
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
                    {currentCar.stkExpirationDate || 'Nenastaveno'}
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
              value={currentCar.insuranceExpirationDate ? `Platné do ${currentCar.insuranceExpirationDate}` : 'Nenastaveno'}
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
                        backgroundColor: theme.surface,
                        borderColor: v.id === currentCar.id ? theme.accent : theme.border,
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
              style={[styles.actionButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                resetForm();
                setModalVisible(true);
              }}
            >
              <Text style={styles.actionButtonText}>Přidat první vozidlo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Nové vozidlo do garáže</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Značka (Brand)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="např. Škoda, Volkswagen, BMW..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Model</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  value={model}
                  onChangeText={setModel}
                  placeholder="např. Octavia, Golf, 320d..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Rok výroby</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                    value={year}
                    onChangeText={setYear}
                    placeholder="např. 2019"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Kód motoru</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                    value={engineCode}
                    onChangeText={setEngineCode}
                    placeholder="např. 2.0 TDI, 1.5 TSI..."
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Státní poznávací značka (SPZ)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  placeholder="např. 1AB 2345"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Aktuální stav tachometru (km)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
                  value={odometer}
                  onChangeText={setOdometer}
                  placeholder="např. 145 000"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
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
  greeting: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleBrand: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
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
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 15,
    marginVertical: 16,
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
