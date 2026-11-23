import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  StatusCard,
  CzechPlateInput,
  DateFormattedInput,
  OdometerFormattedInput,
  DocumentScannerModal,
  ScannedImageResult,
  isValidDate,
  parseOdometer,
  isoToCzechDate,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import { VehicleService } from '../services/vehicles';
import { FuelService, calculateFuelMetrics, FuelMetrics } from '../services/records';
import {
  DocumentScannerService,
  DocumentStorageService,
  VehicleDocumentService,
} from '../services/documents';
import { FuelType, Vehicle, VehicleDocument } from '../types';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_CAR_YEAR = 1900;
const MAX_CAR_YEAR = CURRENT_YEAR + 1;

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'petrol', label: 'Benzín' },
  { value: 'diesel', label: 'Nafta' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'electric', label: 'Elektro' },
  { value: 'lpg', label: 'LPG' },
  { value: 'cng', label: 'CNG' },
];

const getFuelLabel = (fuelType: FuelType): string =>
  FUEL_OPTIONS.find((opt) => opt.value === fuelType)?.label ?? fuelType;

type ComplianceMode = 'scan' | 'manual' | 'later';

export const GarageScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { user } = useAuth();
  const { vehicles, selectedVehicle, setSelectedVehicle, isLoading, refreshVehicles } = useVehicle();

  const [refreshing, setRefreshing] = useState(false);

  // Add vehicle 2-step modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [creationStep, setCreationStep] = useState<1 | 2>(1);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engineCode, setEngineCode] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [licensePlate, setLicensePlate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [complianceMode, setComplianceMode] = useState<ComplianceMode>('scan');
  const [stkDate, setStkDate] = useState('');
  const [insuranceDate, setInsuranceDate] = useState('');
  const [extractedVin, setExtractedVin] = useState('');
  const [stkScan, setStkScan] = useState<ScannedImageResult | null>(null);
  const [insuranceScan, setInsuranceScan] = useState<ScannedImageResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Update compliance dates later modal state
  const [complianceModalVisible, setComplianceModalVisible] = useState(false);
  const [laterMode, setLaterMode] = useState<'scan' | 'manual'>('scan');
  const [laterStkDate, setLaterStkDate] = useState('');
  const [laterInsuranceDate, setLaterInsuranceDate] = useState('');
  const [laterExtractedVin, setLaterExtractedVin] = useState('');
  const [laterStkScan, setLaterStkScan] = useState<ScannedImageResult | null>(null);
  const [laterInsuranceScan, setLaterInsuranceScan] = useState<ScannedImageResult | null>(null);
  const [isSavingLater, setIsSavingLater] = useState(false);

  // Shared Scanner Modal state
  const [scannerTarget, setScannerTarget] = useState<
    'create_stk' | 'create_insurance' | 'later_stk' | 'later_insurance' | null
  >(null);
  const [analyzingKind, setAnalyzingKind] = useState<'stk' | 'insurance' | null>(null);

  // Uploaded documents, fuel metrics & preview state for active vehicle
  const [vehicleDocs, setVehicleDocs] = useState<VehicleDocument[]>([]);
  const [fuelMetrics, setFuelMetrics] = useState<FuelMetrics | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const currentCar = selectedVehicle || vehicles[0];
  const stkDoc = vehicleDocs.find((d) => d.docType === 'stk_protocol');
  const insuranceDoc = vehicleDocs.find((d) => d.docType === 'green_card');

  const loadVehicleExtras = useCallback(async (vehicleId?: string) => {
    if (!vehicleId) {
      setVehicleDocs([]);
      setFuelMetrics(null);
      return;
    }
    try {
      const [docs, fuelEntries] = await Promise.all([
        VehicleDocumentService.getDocuments(vehicleId),
        FuelService.getEntries(vehicleId),
      ]);
      setVehicleDocs(docs);
      setFuelMetrics(calculateFuelMetrics(fuelEntries));
    } catch {
      setVehicleDocs([]);
      setFuelMetrics(null);
    }
  }, []);

  useEffect(() => {
    loadVehicleExtras(currentCar?.id);
  }, [currentCar?.id, loadVehicleExtras]);

  useFocusEffect(
    useCallback(() => {
      loadVehicleExtras(currentCar?.id);
    }, [currentCar?.id, loadVehicleExtras]),
  );

  const openDocumentPreview = async (doc: VehicleDocument) => {
    setIsLoadingPreview(true);
    setPreviewUri(null);
    const resolved = await DocumentStorageService.resolveImageUrl(doc.imageUrl);
    setIsLoadingPreview(false);
    if (!resolved) {
      Alert.alert('Chyba', 'Nepodařilo se načíst náhled nahraného dokumentu.');
      return;
    }
    if (doc.imageUrl.toLowerCase().includes('.pdf') || resolved.toLowerCase().includes('.pdf')) {
      await WebBrowser.openBrowserAsync(resolved);
      return;
    }
    setPreviewUri(resolved);
  };

  const resetForm = () => {
    setCreationStep(1);
    setBrand('');
    setModel('');
    setYear('');
    setEngineCode('');
    setFuelType('petrol');
    setLicensePlate('');
    setOdometer('');
    setComplianceMode('scan');
    setStkDate('');
    setInsuranceDate('');
    setExtractedVin('');
    setStkScan(null);
    setInsuranceScan(null);
  };

  const openComplianceModal = (vehicle: Vehicle) => {
    setLaterMode('scan');
    setLaterStkDate(isoToCzechDate(vehicle.stkExpirationDate) || '');
    setLaterInsuranceDate(isoToCzechDate(vehicle.insuranceExpirationDate) || '');
    setLaterExtractedVin(vehicle.vin || '');
    setLaterStkScan(null);
    setLaterInsuranceScan(null);
    setComplianceModalVisible(true);
  };

  const handleYearChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);

    if (!digits) {
      setYear('');
      return;
    }

    const minPossible = parseInt(digits.padEnd(4, '0'), 10);
    const maxPossible = parseInt(digits.padEnd(4, '9'), 10);
    if (maxPossible < MIN_CAR_YEAR || minPossible > MAX_CAR_YEAR) {
      return;
    }

    setYear(digits);
  };

  const parsedYearNumber = year.length === 4 ? parseInt(year, 10) : null;
  const isYearInvalid =
    parsedYearNumber !== null && (parsedYearNumber < MIN_CAR_YEAR || parsedYearNumber > MAX_CAR_YEAR);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshVehicles();
    await loadVehicleExtras(currentCar?.id);
    setRefreshing(false);
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
              if (selectedVehicle?.id === vehicle.id) {
                setSelectedVehicle(null);
              }
              await refreshVehicles();
            } else {
              Alert.alert('Chyba', 'Nepodařilo se smazat vozidlo.');
            }
          },
        },
      ]
    );
  };

  const validateStep1 = (): { cleanPlate: string; parsedYear: number } | null => {
    if (!brand.trim() || !model.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím značku a model vozidla.');
      return null;
    }

    const cleanPlate = licensePlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPlate) {
      Alert.alert('Chyba', 'Zadejte prosím státní poznávací značku (SPZ).');
      return null;
    }

    if (cleanPlate.length < 5) {
      Alert.alert(
        'Neplatná SPZ',
        'Zadejte prosím platnou českou SPZ (standardně 7 kolonek, na přání max. 8 kolonek).'
      );
      return null;
    }

    const cleanYear = year.trim();
    if (!cleanYear) {
      Alert.alert('Chyba', 'Zadejte prosím rok výroby vozidla (např. 2019).');
      return null;
    }

    if (cleanYear.length !== 4) {
      Alert.alert('Neplatný rok výroby', 'Zadejte prosím kompletní 4místný rok výroby (např. 2019).');
      return null;
    }

    const parsedYear = parseInt(cleanYear, 10);
    if (isNaN(parsedYear) || parsedYear < MIN_CAR_YEAR || parsedYear > MAX_CAR_YEAR) {
      Alert.alert(
        'Neplatný rok výroby',
        `Rok výroby musí být reálný rok v rozmezí ${MIN_CAR_YEAR} až ${MAX_CAR_YEAR}.`
      );
      return null;
    }

    return { cleanPlate, parsedYear };
  };

  const handleGoToStep2 = () => {
    if (!validateStep1()) return;
    setCreationStep(2);
  };

  const handleScannerCapture = async (result: ScannedImageResult) => {
    const target = scannerTarget;
    if (!target) return;

    const isStk = target === 'create_stk' || target === 'later_stk';
    const isCreate = target === 'create_stk' || target === 'create_insurance';

    if (target === 'create_stk') setStkScan(result);
    if (target === 'create_insurance') setInsuranceScan(result);
    if (target === 'later_stk') setLaterStkScan(result);
    if (target === 'later_insurance') setLaterInsuranceScan(result);

    setAnalyzingKind(isStk ? 'stk' : 'insurance');
    try {
      if (isStk) {
        const extracted = await DocumentScannerService.analyzeDocument(
          result.base64,
          'stk',
          result.mimeType,
        );
        if (extracted.stkExpirationDate && isValidDate(extracted.stkExpirationDate)) {
          if (isCreate) setStkDate(extracted.stkExpirationDate);
          else setLaterStkDate(extracted.stkExpirationDate);
        }
        if (extracted.vin) {
          if (isCreate) setExtractedVin(extracted.vin);
          else setLaterExtractedVin(extracted.vin);
        }
        Alert.alert(
          'Protokol STK vytěžen',
          `Platnost STK: ${extracted.stkExpirationDate || 'nerozpoznáno (můžete upravit níže)'}${extracted.vin ? `\nVIN: ${extracted.vin}` : ''
          }`,
        );
      } else {
        const extracted = await DocumentScannerService.analyzeDocument(
          result.base64,
          'insurance',
          result.mimeType,
        );
        if (extracted.insuranceExpirationDate && isValidDate(extracted.insuranceExpirationDate)) {
          if (isCreate) setInsuranceDate(extracted.insuranceExpirationDate);
          else setLaterInsuranceDate(extracted.insuranceExpirationDate);
        }
        Alert.alert(
          'Zelená karta vytěžena',
          `Platnost pojištění do: ${extracted.insuranceExpirationDate || 'nerozpoznáno (můžete upravit níže)'
          }`,
        );
      }
    } catch (err: any) {
      Alert.alert(
        'AI vytěžování nedostupné',
        `${err?.message || 'Nepodařilo se automaticky přečíst datum z dokumentu.'}\n\nSnímek zůstal připojen, datum můžete zadat nebo upravit ručně.`,
      );
    } finally {
      setAnalyzingKind(null);
    }
  };

  const saveComplianceDocuments = async (
    vehicleId: string,
    stkImage: ScannedImageResult | null,
    stkExp: string | undefined,
    insImage: ScannedImageResult | null,
    insExp: string | undefined,
  ) => {
    const tasks: Promise<unknown>[] = [];

    if (stkImage) {
      tasks.push(
        (async () => {
          const path = await DocumentStorageService.uploadImage({
            vehicleId,
            folder: 'documents',
            localUri: stkImage.uri,
            base64: stkImage.base64,
            mimeType: stkImage.mimeType,
          });
          await VehicleDocumentService.addDocument({
            vehicleId,
            docType: 'stk_protocol',
            title: 'Protokol STK',
            imageUrl: path,
            expirationDate: stkExp,
          });
        })(),
      );
    }

    if (insImage) {
      tasks.push(
        (async () => {
          const path = await DocumentStorageService.uploadImage({
            vehicleId,
            folder: 'documents',
            localUri: insImage.uri,
            base64: insImage.base64,
            mimeType: insImage.mimeType,
          });
          await VehicleDocumentService.addDocument({
            vehicleId,
            docType: 'green_card',
            title: 'Zelená karta',
            imageUrl: path,
            expirationDate: insExp,
          });
        })(),
      );
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }
  };

  const handleAddVehicle = async () => {
    const step1 = validateStep1();
    if (!step1) {
      setCreationStep(1);
      return;
    }

    const finalStk = complianceMode === 'later' ? '' : stkDate.trim();
    const finalInsurance = complianceMode === 'later' ? '' : insuranceDate.trim();

    if (finalStk && !isValidDate(finalStk)) {
      Alert.alert(
        'Neplatné datum STK',
        'Zadejte prosím platné kalendářní datum ve formátu DD.MM.RRRR (např. 24.11.2026) nebo pole vymažte.'
      );
      return;
    }

    if (finalInsurance && !isValidDate(finalInsurance)) {
      Alert.alert(
        'Neplatné datum pojištění',
        'Zadejte prosím platné kalendářní datum ve formátu DD.MM.RRRR (např. 31.12.2026) nebo pole vymažte.'
      );
      return;
    }

    if (!user) return;

    setIsSaving(true);
    try {
      const parsedOdo = parseOdometer(odometer);
      const formattedPlate =
        step1.cleanPlate.length === 7
          ? `${step1.cleanPlate.slice(0, 3)} ${step1.cleanPlate.slice(3)}`
          : step1.cleanPlate;

      const res = await VehicleService.addVehicle({
        ownerId: user.id,
        brand: brand.trim(),
        model: model.trim(),
        year: step1.parsedYear,
        engineCode: engineCode.trim() || 'Standard',
        fuelType,
        currentOdometer: parsedOdo,
        vin: extractedVin.trim() || undefined,
        licensePlate: formattedPlate,
        stkExpirationDate: finalStk || undefined,
        insuranceExpirationDate: finalInsurance || undefined,
        oilIntervalKm: 15000,
        lastOilChangeKm: parsedOdo,
      });

      if (res.error) {
        Alert.alert('Chyba', res.error);
      } else if (res.vehicle) {
        if (complianceMode === 'scan') {
          await saveComplianceDocuments(
            res.vehicle.id,
            stkScan,
            finalStk || undefined,
            insuranceScan,
            finalInsurance || undefined,
          );
        }
        resetForm();
        setModalVisible(false);
        await refreshVehicles();
        setSelectedVehicle(res.vehicle);
        Alert.alert('Úspěch', 'Vozidlo bylo úspěšně přidáno do garáže.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLaterCompliance = async () => {
    if (!currentCar) return;
    const finalStk = laterStkDate.trim();
    const finalInsurance = laterInsuranceDate.trim();

    if (finalStk && !isValidDate(finalStk)) {
      Alert.alert('Neplatné datum STK', 'Zadejte platné datum ve formátu DD.MM.RRRR.');
      return;
    }
    if (finalInsurance && !isValidDate(finalInsurance)) {
      Alert.alert('Neplatné datum pojištění', 'Zadejte platné datum ve formátu DD.MM.RRRR.');
      return;
    }

    setIsSavingLater(true);
    try {
      const res = await VehicleService.updateComplianceDates(currentCar, {
        stkExpirationDate: finalStk || undefined,
        insuranceExpirationDate: finalInsurance || undefined,
        vin: laterExtractedVin.trim() || undefined,
      });

      if (!res.success) {
        Alert.alert('Chyba', res.error || 'Nepodařilo se uložit data.');
        return;
      }

      if (laterMode === 'scan') {
        await saveComplianceDocuments(
          currentCar.id,
          laterStkScan,
          finalStk || undefined,
          laterInsuranceScan,
          finalInsurance || undefined,
        );
      }

      setComplianceModalVisible(false);
      await refreshVehicles();
      await loadVehicleExtras(currentCar.id);
      Alert.alert('Uloženo', 'Platnost STK a povinného ručení byla aktualizována.');
    } finally {
      setIsSavingLater(false);
    }
  };

  const renderScanSection = (
    mode: 'create' | 'later',
    currentStkScan: ScannedImageResult | null,
    currentStkDate: string,
    onChangeStkDate: (d: string) => void,
    currentInsScan: ScannedImageResult | null,
    currentInsDate: string,
    onChangeInsDate: (d: string) => void,
  ) => (
    <View style={{ gap: 12 }}>
      {/* 1. STK Document */}
      <View style={[styles.docScanBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <View style={styles.docScanHeader}>
          <Ionicons name="clipboard-outline" size={20} color={theme.accent} />
          <Text style={[styles.docScanTitle, { color: theme.textPrimary }]}>
            1. Protokol STK / ORV
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.docScanBtn, { borderColor: theme.accent, backgroundColor: theme.badgeBg }]}
          onPress={() => setScannerTarget(mode === 'create' ? 'create_stk' : 'later_stk')}
          disabled={analyzingKind !== null}
        >
          {analyzingKind === 'stk' ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="camera-outline" size={18} color={theme.accent} />
          )}
          <Text style={[styles.docScanBtnText, { color: theme.accent }]}>
            {analyzingKind === 'stk'
              ? 'Vytěžuji datum STK...'
              : currentStkScan
                ? 'Změnit fotku / dokument STK'
                : 'Vyfotit nebo nahrát STK'}
          </Text>
        </TouchableOpacity>
        {currentStkScan && (
          <View style={styles.scanPreviewRow}>
            {currentStkScan.mimeType?.includes('pdf') ? (
              <View style={[styles.pdfBadge, { backgroundColor: theme.badgeBg, borderColor: theme.accent }]}>
                <Ionicons name="document-text" size={20} color={theme.accent} />
              </View>
            ) : (
              <Image source={{ uri: currentStkScan.uri }} style={styles.scanThumb} />
            )}
            <Text style={[styles.scanPreviewText, { color: theme.textSecondary }]} numberOfLines={1}>
              {currentStkScan.fileName || 'Dokument STK připojen'}
            </Text>
          </View>
        )}
        <DateFormattedInput
          label="Platnost STK (zjištěno / k úpravě)"
          value={currentStkDate}
          onChangeDate={onChangeStkDate}
          theme={theme}
          isDark={isDark}
        />
      </View>

      {/* 2. Green Card / Insurance */}
      <View style={[styles.docScanBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
        <View style={styles.docScanHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={theme.accent} />
          <Text style={[styles.docScanTitle, { color: theme.textPrimary }]}>
            2. Zelená karta / Povinné ručení
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.docScanBtn, { borderColor: theme.accent, backgroundColor: theme.badgeBg }]}
          onPress={() => setScannerTarget(mode === 'create' ? 'create_insurance' : 'later_insurance')}
          disabled={analyzingKind !== null}
        >
          {analyzingKind === 'insurance' ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Ionicons name="camera-outline" size={18} color={theme.accent} />
          )}
          <Text style={[styles.docScanBtnText, { color: theme.accent }]}>
            {analyzingKind === 'insurance'
              ? 'Vytěžuji platnost pojištění...'
              : currentInsScan
                ? 'Změnit fotku / dokument pojištění'
                : 'Vyfotit nebo nahrát Zelenou kartu'}
          </Text>
        </TouchableOpacity>
        {currentInsScan && (
          <View style={styles.scanPreviewRow}>
            {currentInsScan.mimeType?.includes('pdf') ? (
              <View style={[styles.pdfBadge, { backgroundColor: theme.badgeBg, borderColor: theme.accent }]}>
                <Ionicons name="document-text" size={20} color={theme.accent} />
              </View>
            ) : (
              <Image source={{ uri: currentInsScan.uri }} style={styles.scanThumb} />
            )}
            <Text style={[styles.scanPreviewText, { color: theme.textSecondary }]} numberOfLines={1}>
              {currentInsScan.fileName || 'Zelená karta připojena'}
            </Text>
          </View>
        )}
        <DateFormattedInput
          label="Platnost pojištění (zjištěno / k úpravě)"
          value={currentInsDate}
          onChangeDate={onChangeInsDate}
          theme={theme}
          isDark={isDark}
        />
      </View>
    </View>
  );

  const renderComplianceSection = ({
    mode,
    selectedMode,
    onSelectMode,
    allowLater,
    currentStkScan,
    currentStkDate,
    onChangeStkDate,
    currentInsScan,
    currentInsDate,
    onChangeInsDate,
  }: {
    mode: 'create' | 'later';
    selectedMode: ComplianceMode;
    onSelectMode: (next: ComplianceMode) => void;
    allowLater: boolean;
    currentStkScan: ScannedImageResult | null;
    currentStkDate: string;
    onChangeStkDate: (d: string) => void;
    currentInsScan: ScannedImageResult | null;
    currentInsDate: string;
    onChangeInsDate: (d: string) => void;
  }) => {
    const modeOptions: {
      key: ComplianceMode;
      icon: keyof typeof Ionicons.glyphMap;
      title: string;
      subtitle: string;
    }[] = [
      {
        key: 'scan',
        icon: 'scan-outline',
        title: 'Vyfotit / nahrát dokumenty (AI)',
        subtitle: 'Samostatný snímek pro STK a Zelenou kartu',
      },
      {
        key: 'manual',
        icon: 'create-outline',
        title: 'Zadat ručně',
        subtitle: 'Vyplnit data expirace ručně nebo předvolbou',
      },
      ...(allowLater
        ? [
            {
              key: 'later' as const,
              icon: 'time-outline' as const,
              title: 'Odložit a zadat později',
              subtitle: 'Doplníte kdykoliv později v přehledu vozidla',
            },
          ]
        : []),
    ];

    const secondSectionTitle =
      selectedMode === 'scan'
        ? '2. PŘÍMÉ ZADÁNÍ — SKEN DOKLADŮ'
        : selectedMode === 'manual'
          ? '2. PŘÍMÉ ZADÁNÍ PLATNOSTI'
          : '2. ODLOŽENÍ ZADÁNÍ';

    return (
      <View>
        {/* Sekce 1: Výběr způsobu zadání */}
        <Text style={[styles.complianceSectionLabel, { color: theme.textSecondary }]}>
          1. ZPŮSOB ZADÁNÍ
        </Text>
        <View style={styles.modeSelectorCol}>
          {modeOptions.map((opt) => {
            const isSelected = selectedMode === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.modeCard,
                  {
                    backgroundColor: isSelected ? theme.badgeBg : theme.inputBg,
                    borderColor: isSelected ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => onSelectMode(opt.key)}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={isSelected ? theme.accent : theme.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modeTitle, { color: theme.textPrimary }]}>
                    {opt.title}
                  </Text>
                  <Text style={[styles.modeSub, { color: theme.textSecondary }]}>
                    {opt.subtitle}
                  </Text>
                </View>
                <Ionicons
                  name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isSelected ? theme.accent : theme.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Oddělovač */}
        <View style={[styles.complianceDivider, { backgroundColor: theme.border }]} />

        {/* Sekce 2: Přímé zadávání */}
        <Text style={[styles.complianceSectionLabel, { color: theme.accent }]}>
          {secondSectionTitle}
        </Text>
        <View
          style={[
            styles.complianceInputSection,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          {selectedMode === 'scan' &&
            renderScanSection(
              mode,
              currentStkScan,
              currentStkDate,
              onChangeStkDate,
              currentInsScan,
              currentInsDate,
              onChangeInsDate,
            )}

          {selectedMode === 'manual' && (
            <View style={{ gap: 6 }}>
              <DateFormattedInput
                label="Platnost STK"
                value={currentStkDate}
                onChangeDate={onChangeStkDate}
                theme={theme}
                isDark={isDark}
                presets={[
                  { label: '+2 roky (Standard ČR)', addYears: 2 },
                  { label: '+4 roky (Nové auto)', addYears: 4 },
                ]}
              />
              <DateFormattedInput
                label="Platnost povinného ručení"
                value={currentInsDate}
                onChangeDate={onChangeInsDate}
                theme={theme}
                isDark={isDark}
                presets={[
                  { label: '+1 rok (Roční)', addYears: 1 },
                  { label: 'Dnes', isToday: true },
                ]}
              />
            </View>
          )}

          {selectedMode === 'later' && (
            <View style={[styles.laterNotice, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <Ionicons name="information-circle-outline" size={20} color={theme.accent} />
              <Text style={[styles.laterNoticeText, { color: theme.textSecondary }]}>
                Vozidlo se uloží bez dat expirace. Kdykoliv v detailu auta pak můžete vybrat naskenování dokladů nebo ruční zadání.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

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
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={25} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={theme.accent} style={{ marginVertical: 40 }} />
        ) : currentCar ? (
          <>
            {/* Vehicle Selector (if more than 1) */}
            {vehicles.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginBottom: 8 }]}>
                  Výběr vozidla ({vehicles.length})
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
                    R.v. {currentCar.year} • Motor {currentCar.engineCode} • {getFuelLabel(currentCar.fuelType)}
                  </Text>
                  {currentCar.vin ? (
                    <View style={[styles.vinPill, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}>
                      <Text style={[styles.vinLabel, { color: theme.accent }]}>VIN</Text>
                      <Text style={[styles.vinValue, { color: theme.textPrimary }]} selectable>
                        {currentCar.vin}
                      </Text>
                    </View>
                  ) : null}
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
                <TouchableOpacity style={styles.statItem} onPress={() => openComplianceModal(currentCar)}>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Platnost STK</Text>
                  <Text style={[styles.statValue, { color: theme.warning }]}>
                    {isoToCzechDate(currentCar.stkExpirationDate) || 'Nenastaveno'}
                  </Text>
                </TouchableOpacity>
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
              value={
                fuelMetrics?.avgConsumption !== null && fuelMetrics?.avgConsumption !== undefined
                  ? `${fuelMetrics.avgConsumption.toFixed(1)} l/100 km`
                  : 'Zatím nespočteno'
              }
              subtitle={
                fuelMetrics?.costPerKm !== null && fuelMetrics?.costPerKm !== undefined
                  ? `Průměrný náklad ${fuelMetrics.costPerKm.toFixed(2)} Kč/km`
                  : 'Vyžaduje alespoň dvě plná tankování'
              }
            />

            <TouchableOpacity onPress={() => openComplianceModal(currentCar)} activeOpacity={0.85}>
              <StatusCard
                title="Pojištění vozidla"
                value={currentCar.insuranceExpirationDate ? `Platné do ${isoToCzechDate(currentCar.insuranceExpirationDate)}` : 'Nenastaveno'}
                subtitle="Povinné ručení"
              />
            </TouchableOpacity>

            {(stkDoc || insuranceDoc) && (
              <View style={styles.docsQuickRow}>
                {stkDoc && (
                  <TouchableOpacity
                    style={[styles.docQuickBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => openDocumentPreview(stkDoc)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="clipboard-outline" size={17} color={theme.accent} />
                    <Text style={[styles.docQuickBtnText, { color: theme.textPrimary }]}>Zobrazit STK</Text>
                    <Ionicons name="eye-outline" size={15} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
                {insuranceDoc && (
                  <TouchableOpacity
                    style={[styles.docQuickBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
                    onPress={() => openDocumentPreview(insuranceDoc)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="shield-checkmark-outline" size={17} color={theme.accent} />
                    <Text style={[styles.docQuickBtnText, { color: theme.textPrimary }]}>Zobrazit ručení</Text>
                    <Ionicons name="eye-outline" size={15} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {(!currentCar.stkExpirationDate || !currentCar.insuranceExpirationDate) && (
              <TouchableOpacity
                style={[
                  styles.completeComplianceBtn,
                  { borderColor: theme.accent, backgroundColor: theme.badgeBg },
                ]}
                onPress={() => openComplianceModal(currentCar)}
                activeOpacity={0.85}
              >
                <Ionicons name="calendar-outline" size={18} color={theme.accent} />
                <Text style={[styles.completeComplianceText, { color: theme.accent }]}>
                  Doplnit datum STK a povinného ručení
                </Text>
              </TouchableOpacity>
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

      {/* Add Vehicle 2-Step Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.stepTag, { color: theme.accent }]}>
                  KROK {creationStep} Z 2
                </Text>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {creationStep === 1 ? 'Nové vozidlo do garáže' : 'STK a Povinné ručení'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {creationStep === 1 ? (
              <>
                <ScrollView
                  style={{ maxHeight: 460 }}
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
                    <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Palivo *</Text>
                    <View style={styles.fuelChipsRow}>
                      {FUEL_OPTIONS.map((opt) => {
                        const selected = fuelType === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[
                              styles.fuelChip,
                              {
                                backgroundColor: selected ? theme.accent : theme.inputBg,
                                borderColor: selected ? theme.accent : theme.border,
                              },
                            ]}
                            onPress={() => setFuelType(opt.value)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.fuelChipText,
                                { color: selected ? '#FFFFFF' : theme.textPrimary },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
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
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.accent }]}
                  onPress={handleGoToStep2}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>Pokračovat (STK a pojištění)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <ScrollView
                  style={{ maxHeight: 460 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 10 }}
                >
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    Vyberte způsob zadání platnosti STK a povinného ručení:
                  </Text>

                  {renderComplianceSection({
                    mode: 'create',
                    selectedMode: complianceMode,
                    onSelectMode: setComplianceMode,
                    allowLater: true,
                    currentStkScan: stkScan,
                    currentStkDate: stkDate,
                    onChangeStkDate: setStkDate,
                    currentInsScan: insuranceScan,
                    currentInsDate: insuranceDate,
                    onChangeInsDate: setInsuranceDate,
                  })}
                </ScrollView>

                <View style={styles.stepActionsRow}>
                  <TouchableOpacity
                    style={[styles.backButton, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
                    onPress={() => setCreationStep(1)}
                    disabled={isSaving}
                  >
                    <Text style={[styles.backButtonText, { color: theme.textPrimary }]}>Zpět</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.accent, flex: 2, marginTop: 0 }]}
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
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Complete / Edit STK & Insurance Later Modal */}
      <Modal visible={complianceModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                STK a Povinné ručení
              </Text>
              <TouchableOpacity onPress={() => setComplianceModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ maxHeight: 460 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              {renderComplianceSection({
                mode: 'later',
                selectedMode: laterMode,
                onSelectMode: (next) => setLaterMode(next === 'later' ? 'manual' : next),
                allowLater: false,
                currentStkScan: laterStkScan,
                currentStkDate: laterStkDate,
                onChangeStkDate: setLaterStkDate,
                currentInsScan: laterInsuranceScan,
                currentInsDate: laterInsuranceDate,
                onChangeInsDate: setLaterInsuranceDate,
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.accent }]}
              onPress={handleSaveLaterCompliance}
              disabled={isSavingLater}
              activeOpacity={0.85}
            >
              {isSavingLater ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Uložit platnost dokladů</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Camera / Gallery Scanner Modal */}
      <DocumentScannerModal
        visible={scannerTarget !== null}
        title={
          scannerTarget === 'create_stk' || scannerTarget === 'later_stk'
            ? 'Skenovat protokol STK'
            : 'Skenovat Zelenou kartu'
        }
        onClose={() => setScannerTarget(null)}
        onCapture={handleScannerCapture}
      />

      {/* Fullscreen Document Preview Modal */}
      <Modal
        visible={previewUri !== null || isLoadingPreview}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreviewUri(null);
          setIsLoadingPreview(false);
        }}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => {
              setPreviewUri(null);
              setIsLoadingPreview(false);
            }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {isLoadingPreview ? (
            <ActivityIndicator size="large" color="#FF018F" />
          ) : previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          ) : null}
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
    borderRadius: 15,
    backgroundColor: '#FF018F',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
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
  vinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  vinLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  vinValue: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  completeComplianceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  completeComplianceText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  docsQuickRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  docQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  docQuickBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '92%',
    height: '78%',
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
  stepTag: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  complianceSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  modeSelectorCol: {
    gap: 8,
  },
  complianceDivider: {
    height: 1,
    marginVertical: 14,
  },
  complianceInputSection: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  modeSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  docScanBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  docScanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docScanTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  docScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  docScanBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scanPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scanThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  pdfBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanPreviewText: {
    fontSize: 12,
    fontWeight: '600',
  },
  laterNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  laterNoticeText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
  },
  stepActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  backButton: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14.5,
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
  fuelChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fuelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  fuelChipText: {
    fontSize: 13,
    fontWeight: '600',
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
