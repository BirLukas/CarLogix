import React, { useState, useEffect, useCallback } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import {
  formatLogicalDate,
  formatOdometer,
  getTodayCzechDate,
  isValidDate,
  ActiveVehicleBar,
  DocumentScannerModal,
  ScannedImageResult,
} from '../components';
import { useVehicle } from '../context/VehicleContext';
import { ServiceBookService, parseStrictDecimal } from '../services/records';
import {
  DocumentScannerService,
  DocumentStorageService,
  VehicleDocumentService,
} from '../services/documents';
import { VehicleService } from '../services/vehicles';
import {
  BlacklistItem,
  ServiceEntry,
  VehicleDocument,
  VehicleDocumentType,
} from '../types';

const DOC_TYPE_OPTIONS: Array<{ value: VehicleDocumentType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'technical_certificate', label: 'Technický průkaz', icon: 'document-text-outline' },
  { value: 'green_card', label: 'Zelená karta', icon: 'shield-checkmark-outline' },
  { value: 'stk_protocol', label: 'Protokol STK', icon: 'clipboard-outline' },
  { value: 'purchase_contract', label: 'Kupní smlouva', icon: 'newspaper-outline' },
  { value: 'other', label: 'Jiný dokument', icon: 'folder-outline' },
];

const DOC_TYPE_LABEL: Record<VehicleDocumentType, string> = {
  technical_certificate: 'Technický průkaz',
  green_card: 'Zelená karta',
  stk_protocol: 'Protokol STK',
  purchase_contract: 'Kupní smlouva',
  other: 'Jiný dokument',
};

export const ServiceBookScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { selectedVehicle, refreshVehicles } = useVehicle();

  const [activeTab, setActiveTab] = useState<'history' | 'blacklist' | 'documents'>('history');
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Camera / Gallery Scanner state
  const [scannerTarget, setScannerTarget] = useState<'invoice' | 'blacklist' | 'document' | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);

  // Fullscreen image preview
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Modal: Add Service Entry
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceOdometer, setServiceOdometer] = useState('');
  const [servicePerformer, setServicePerformer] = useState('');
  const [servicePartsText, setServicePartsText] = useState('');
  const [serviceMaterialPrice, setServiceMaterialPrice] = useState('');
  const [serviceLaborPrice, setServiceLaborPrice] = useState('');
  const [serviceInvoiceScan, setServiceInvoiceScan] = useState<ScannedImageResult | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);

  // Modal: Add Blacklist Item
  const [blacklistModalVisible, setBlacklistModalVisible] = useState(false);
  const [blPartName, setBlPartName] = useState('');
  const [blBrand, setBlBrand] = useState('');
  const [blReason, setBlReason] = useState('');
  const [blPhotoScan, setBlPhotoScan] = useState<ScannedImageResult | null>(null);
  const [isSavingBlacklist, setIsSavingBlacklist] = useState(false);

  // Modal: Add Vehicle Document
  const [docModalVisible, setDocModalVisible] = useState(false);
  const [docType, setDocType] = useState<VehicleDocumentType>('technical_certificate');
  const [docTitle, setDocTitle] = useState('');
  const [docExpirationDate, setDocExpirationDate] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [docScan, setDocScan] = useState<ScannedImageResult | null>(null);
  const [isSavingDoc, setIsSavingDoc] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedVehicle) {
      setServiceEntries([]);
      setBlacklist([]);
      setDocuments([]);
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [services, bl, docs] = await Promise.all([
        ServiceBookService.getEntries(selectedVehicle.id),
        ServiceBookService.getBlacklist(selectedVehicle.id),
        VehicleDocumentService.getDocuments(selectedVehicle.id),
      ]);
      setServiceEntries(services);
      setBlacklist(bl);
      setDocuments(docs);
    } catch (err) {
      console.error('Chyba při načítání servisních dat:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedVehicle?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openImagePreview = async (pathOrUri?: string) => {
    if (!pathOrUri) return;
    setIsLoadingPreview(true);
    setPreviewUri(null);
    const resolved = await DocumentStorageService.resolveImageUrl(pathOrUri);
    setIsLoadingPreview(false);
    if (!resolved) {
      Alert.alert('Chyba', 'Nepodařilo se načíst náhled dokumentu.');
      return;
    }
    if (pathOrUri.toLowerCase().includes('.pdf') || resolved.toLowerCase().includes('.pdf')) {
      await WebBrowser.openBrowserAsync(resolved);
      return;
    }
    setPreviewUri(resolved);
  };

  const openAddModal = () => {
    if (!selectedVehicle) {
      Alert.alert('Žádné vozidlo', 'Nejprve přidejte vozidlo v záložce Garáž.');
      return;
    }

    if (activeTab === 'history') {
      setServiceTitle('');
      setServiceDate(getTodayCzechDate());
      setServiceOdometer('');
      setServicePerformer('Vlastní úkon');
      setServicePartsText('');
      setServiceMaterialPrice('');
      setServiceLaborPrice('');
      setServiceInvoiceScan(null);
      setServiceModalVisible(true);
    } else if (activeTab === 'blacklist') {
      setBlPartName('');
      setBlBrand('');
      setBlReason('');
      setBlPhotoScan(null);
      setBlacklistModalVisible(true);
    } else {
      setDocType('technical_certificate');
      setDocTitle('Technický průkaz');
      setDocExpirationDate('');
      setDocNotes('');
      setDocScan(null);
      setDocModalVisible(true);
    }
  };

  const handleScannerCapture = async (result: ScannedImageResult) => {
    if (scannerTarget === 'invoice') {
      setServiceInvoiceScan(result);
      setIsAnalyzingAi(true);
      try {
        const extracted = await DocumentScannerService.analyzeDocument(
          result.base64,
          'invoice',
          result.mimeType,
        );
        if (extracted.title) setServiceTitle(extracted.title);
        if (extracted.date && isValidDate(extracted.date)) setServiceDate(extracted.date);
        if (extracted.odometer && extracted.odometer > 0) {
          setServiceOdometer(formatOdometer(String(extracted.odometer)));
        }
        if (extracted.performer) setServicePerformer(extracted.performer);
        if (extracted.partsSummary) setServicePartsText(extracted.partsSummary);

        const mat = extracted.materialPriceCzK ?? 0;
        const lab = extracted.laborPriceCzK ?? 0;
        const tot = extracted.totalPriceCzK ?? 0;
        if (mat > 0 || lab > 0) {
          setServiceMaterialPrice(String(mat));
          setServiceLaborPrice(String(lab));
        } else if (tot > 0) {
          setServiceMaterialPrice(String(tot));
          setServiceLaborPrice('0');
        }

        Alert.alert(
          'Faktura vytěžena',
          'Údaje byly předvyplněny pomocí AI. Zkontrolujte je prosím před uložením.',
        );
      } catch (err: any) {
        Alert.alert(
          'AI vytěžování nedostupné',
          `${err?.message || 'Nepodařilo se automaticky přečíst fakturu.'}\n\nFotografie faktury zůstala přiložena, údaje můžete doplnit ručně.`,
        );
      } finally {
        setIsAnalyzingAi(false);
      }
    } else if (scannerTarget === 'blacklist') {
      setBlPhotoScan(result);
    } else if (scannerTarget === 'document') {
      setDocScan(result);
    }
  };

  const handleAnalyzeStkDocument = async () => {
    if (!docScan?.base64) {
      Alert.alert('Chybí snímek', 'Nejprve vyfoťte nebo vyberte protokol STK.');
      return;
    }

    setIsAnalyzingAi(true);
    try {
      const extracted = await DocumentScannerService.analyzeDocument(
        docScan.base64,
        'stk',
        docScan.mimeType,
      );
      if (extracted.stkExpirationDate && isValidDate(extracted.stkExpirationDate)) {
        setDocExpirationDate(extracted.stkExpirationDate);
      }
      if (extracted.vin) {
        setDocNotes((prev) =>
          prev.includes(extracted.vin!) ? prev : `${prev ? prev + '\n' : ''}VIN: ${extracted.vin}`,
        );
      }
      Alert.alert(
        'Protokol STK vytěžen',
        `Rozpoznaná platnost STK: ${extracted.stkExpirationDate || 'nezjištěno'}\nVIN: ${extracted.vin || 'nezjištěno'}`,
      );
    } catch (err: any) {
      Alert.alert('Chyba AI vytěžování', err?.message || 'Nepodařilo se vytěžit údaje z STK.');
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handleSaveService = async () => {
    if (!selectedVehicle) return;

    if (!serviceTitle.trim()) {
      Alert.alert('Chyba', 'Zadejte název servisního úkonu.');
      return;
    }

    const trimmedDate = serviceDate.trim() || getTodayCzechDate();
    if (!isValidDate(trimmedDate)) {
      Alert.alert('Chyba', 'Zadejte platné datum ve formátu DD.MM.RRRR.');
      return;
    }

    const odo = parseInt(serviceOdometer.replace(/\s/g, ''), 10);
    if (isNaN(odo) || odo < 0) {
      Alert.alert('Chyba', 'Zadejte platný stav tachometru.');
      return;
    }

    let matPrice = 0;
    if (serviceMaterialPrice.trim()) {
      const parsedMat = parseStrictDecimal(serviceMaterialPrice, true);
      if (parsedMat === null) {
        Alert.alert('Chyba', 'Zadejte platnou nezápornou cenu materiálu.');
        return;
      }
      matPrice = parsedMat;
    }

    let labPrice = 0;
    if (serviceLaborPrice.trim()) {
      const parsedLab = parseStrictDecimal(serviceLaborPrice, true);
      if (parsedLab === null) {
        Alert.alert('Chyba', 'Zadejte platnou nezápornou cenu práce.');
        return;
      }
      labPrice = parsedLab;
    }

    const totalPrice = Math.round(matPrice + labPrice);

    setIsSavingService(true);
    try {
      let invoiceImageUrl: string | undefined;
      if (serviceInvoiceScan) {
        invoiceImageUrl = await DocumentStorageService.uploadImage({
          vehicleId: selectedVehicle.id,
          folder: 'invoices',
          localUri: serviceInvoiceScan.uri,
          base64: serviceInvoiceScan.base64,
          mimeType: serviceInvoiceScan.mimeType,
        });
      }

      await ServiceBookService.addEntry({
        vehicleId: selectedVehicle.id,
        title: serviceTitle.trim(),
        date: trimmedDate,
        odometer: odo,
        performer: servicePerformer.trim() || 'Vlastní úkon',
        partsSummary: servicePartsText.trim(),
        materialPriceCzK: Math.round(matPrice),
        laborPriceCzK: Math.round(labPrice),
        totalPriceCzK: totalPrice,
        invoiceImageUrl,
      });
      const updatedOdo = await VehicleService.updateOdometerIfHigher(selectedVehicle, odo);
      if (updatedOdo) {
        await refreshVehicles();
      }
      setServiceModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit servisní záznam.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = (entry: ServiceEntry) => {
    Alert.alert('Smazat záznam', 'Opravdu chcete tento servisní záznam odstranit?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          const ok = await ServiceBookService.deleteEntry(entry.id, entry.invoiceImageUrl);
          if (!ok) {
            Alert.alert('Chyba', 'Nepodařilo se odstranit servisní záznam.');
            return;
          }
          loadData();
        },
      },
    ]);
  };

  const handleSaveBlacklist = async () => {
    if (!selectedVehicle) return;

    if (!blPartName.trim()) {
      Alert.alert('Chyba', 'Zadejte název dílu.');
      return;
    }
    if (!blBrand.trim()) {
      Alert.alert('Chyba', 'Zadejte značku a katalogový kód dílu.');
      return;
    }
    if (!blReason.trim()) {
      Alert.alert('Chyba', 'Zadejte důvod zařazení na blacklist.');
      return;
    }

    setIsSavingBlacklist(true);
    try {
      let imageUrl: string | undefined;
      if (blPhotoScan) {
        imageUrl = await DocumentStorageService.uploadImage({
          vehicleId: selectedVehicle.id,
          folder: 'blacklist',
          localUri: blPhotoScan.uri,
          base64: blPhotoScan.base64,
          mimeType: blPhotoScan.mimeType,
        });
      }

      await ServiceBookService.addBlacklistItem({
        vehicleId: selectedVehicle.id,
        partName: blPartName.trim(),
        brand: blBrand.trim(),
        reason: blReason.trim(),
        imageUrl,
      });
      setBlacklistModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se přidat díl na blacklist.');
    } finally {
      setIsSavingBlacklist(false);
    }
  };

  const handleDeleteBlacklist = (item: BlacklistItem) => {
    Alert.alert('Odebrat z blacklistu', 'Opravdu chcete odebrat tento díl z blacklistu?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odebrat',
        style: 'destructive',
        onPress: async () => {
          const ok = await ServiceBookService.deleteBlacklistItem(item.id, item.imageUrl);
          if (!ok) {
            Alert.alert('Chyba', 'Nepodařilo se odebrat díl z blacklistu.');
            return;
          }
          loadData();
        },
      },
    ]);
  };

  const handleSaveDocument = async () => {
    if (!selectedVehicle) return;
    if (!docTitle.trim()) {
      Alert.alert('Chyba', 'Zadejte název dokumentu.');
      return;
    }
    if (!docScan) {
      Alert.alert('Chyba', 'Nejprve vyfoťte nebo vyberte dokument.');
      return;
    }
    if (docExpirationDate.trim() && !isValidDate(docExpirationDate.trim())) {
      Alert.alert('Chyba', 'Zadejte platné datum expirace ve formátu DD.MM.RRRR.');
      return;
    }

    setIsSavingDoc(true);
    try {
      const uploadedPath = await DocumentStorageService.uploadImage({
        vehicleId: selectedVehicle.id,
        folder: 'documents',
        localUri: docScan.uri,
        base64: docScan.base64,
        mimeType: docScan.mimeType,
      });

      await VehicleDocumentService.addDocument({
        vehicleId: selectedVehicle.id,
        docType,
        title: docTitle.trim(),
        imageUrl: uploadedPath,
        expirationDate: docExpirationDate.trim() || undefined,
        notes: docNotes.trim() || undefined,
      });
      setDocModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit dokument.');
    } finally {
      setIsSavingDoc(false);
    }
  };

  const handleDeleteDocument = (doc: VehicleDocument) => {
    Alert.alert('Smazat dokument', `Opravdu chcete smazat "${doc.title}"?`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          const ok = await VehicleDocumentService.deleteDocument(doc);
          if (!ok) {
            Alert.alert('Chyba', 'Nepodařilo se odstranit dokument.');
            return;
          }
          loadData();
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Ambient background glows */}
      <View style={[styles.ambientTopGlow, { backgroundColor: theme.ambientGlowPrimary, opacity: 1 }]} pointerEvents="none" />
      <View style={[styles.ambientRightGlow, { backgroundColor: theme.ambientGlowSecondary, opacity: 1 }]} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.neonPink} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <View style={styles.brandRow}>
              <Text style={styles.brandTag}>CARLOGIX • SERVIS</Text>
            </View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Servis & Údržba</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Servisní kniha, blacklist dílů a archiv dokladů
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.neonPink }]}
            activeOpacity={0.85}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={25} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ActiveVehicleBar />

        {/* Tab switcher: Historie vs Blacklist vs Dokumenty */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'history' && { backgroundColor: theme.neonPink },
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="construct-outline"
              size={16}
              color={activeTab === 'history' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'history' ? '#FFFFFF' : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              Historie {serviceEntries.length > 0 ? `(${serviceEntries.length})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'blacklist' && { backgroundColor: theme.danger },
            ]}
            onPress={() => setActiveTab('blacklist')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="warning-outline"
              size={16}
              color={activeTab === 'blacklist' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'blacklist' ? '#FFFFFF' : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              Blacklist ({blacklist.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'documents' && { backgroundColor: theme.neonPink },
            ]}
            onPress={() => setActiveTab('documents')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="folder-open-outline"
              size={16}
              color={activeTab === 'documents' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'documents' ? '#FFFFFF' : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              Doklady ({documents.length})
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 24 }} />
        ) : activeTab === 'history' ? (
          <View style={styles.contentSection}>
            {serviceEntries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Ionicons name="construct-outline" size={40} color={theme.neonPink} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Žádné servisní záznamy</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Zatím zde nemáte evidovány žádné servisní úkony. Klepnutím na tlačítko + přidejte nový záznam nebo naskenujte fakturu pomocí AI.
                </Text>
              </View>
            ) : (
              serviceEntries.map((item) => (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                        {item.date} • {item.odometer.toLocaleString('cs-CZ')} km • {item.performer || 'Vlastní úkon'}
                      </Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      {item.invoiceImageUrl ? (
                        <TouchableOpacity
                          onPress={() => openImagePreview(item.invoiceImageUrl)}
                          style={[styles.attachmentChip, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}
                        >
                          <Ionicons name="receipt-outline" size={14} color={theme.neonPink} />
                          <Text style={[styles.attachmentChipText, { color: theme.neonPink }]}>Faktura</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.badgeSuccess, { backgroundColor: theme.success + '20' }]}>
                          <Text style={[styles.badgeText, { color: theme.success }]}>Hotovo</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDeleteService(item)}
                        hitSlop={10}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {item.partsSummary ? (
                    <View style={styles.partsList}>
                      <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                        {item.partsSummary}
                      </Text>
                    </View>
                  ) : null}

                  <View style={[styles.cardFooter, { borderTopColor: theme.cardBorder }]}>
                    <Text style={[styles.costLabel, { color: theme.textSecondary }]}>
                      Materiál: {(item.materialPriceCzK || 0).toLocaleString('cs-CZ')} Kč | Práce: {(item.laborPriceCzK || 0).toLocaleString('cs-CZ')} Kč
                    </Text>
                    <Text style={[styles.totalCost, { color: theme.neonPink }]}>
                      {item.totalPriceCzK.toLocaleString('cs-CZ')} Kč
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : activeTab === 'blacklist' ? (
          <View style={styles.contentSection}>
            <View
              style={[
                styles.blacklistWarningCard,
                {
                  backgroundColor: isDark ? '#2A0C6240' : 'rgba(239, 68, 68, 0.08)',
                  borderColor: isDark ? theme.danger : 'rgba(239, 68, 68, 0.3)',
                },
              ]}
            >
              <Ionicons name="information-circle" size={22} color={theme.danger} />
              <Text style={[styles.blacklistWarningText, { color: isDark ? '#FFA4A4' : '#DC2626' }]}>
                Díly na tomto seznamu se neosvědčily nebo nepasovaly. AI vyhledávač vás před jejich koupí automaticky varuje.
              </Text>
            </View>

            {blacklist.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={40} color={theme.neonPink} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Blacklist je prázdný</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Nemáte evidovány žádné nevyhovující díly. Nekvalitní nebo nepasující díly můžete přidat tlačítkem + výše.
                </Text>
              </View>
            ) : (
              blacklist.map((item) => (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.partName}</Text>
                      <Text style={[styles.blacklistBrand, { color: theme.danger }]}>Značka / kód: {item.brand}</Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      {item.imageUrl ? (
                        <TouchableOpacity
                          onPress={() => openImagePreview(item.imageUrl)}
                          style={[styles.attachmentChip, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}
                        >
                          <Ionicons name="image-outline" size={14} color={theme.neonPink} />
                          <Text style={[styles.attachmentChipText, { color: theme.neonPink }]}>Foto</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity
                        onPress={() => handleDeleteBlacklist(item)}
                        hitSlop={10}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={[styles.blacklistReason, { color: theme.textSecondary }]}>
                    Důvod: {item.reason}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.contentSection}>
            {documents.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <Ionicons name="folder-open-outline" size={40} color={theme.neonPink} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Archiv dokladů je prázdný</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Uložte si fotografie technického průkazu, zelené karty, kupní smlouvy nebo protokolu STK pomocí tlačítka +.
                </Text>
              </View>
            ) : (
              documents.map((doc) => (
                <View
                  key={doc.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docTypeTag, { color: theme.neonPink }]}>
                        {DOC_TYPE_LABEL[doc.docType] || 'Dokument'}
                      </Text>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{doc.title}</Text>
                      {doc.expirationDate ? (
                        <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                          Platnost do: {doc.expirationDate}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <TouchableOpacity
                        onPress={() => openImagePreview(doc.imageUrl)}
                        style={[styles.attachmentChip, { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder }]}
                      >
                        <Ionicons name="eye-outline" size={14} color={theme.neonPink} />
                        <Text style={[styles.attachmentChipText, { color: theme.neonPink }]}>Zobrazit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteDocument(doc)}
                        hitSlop={10}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {doc.notes ? (
                    <Text style={[styles.blacklistReason, { color: theme.textSecondary }]}>{doc.notes}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Přidat servisní záznam */}
      <Modal visible={serviceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Přidat servisní záznam</Text>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* AI Scan Invoice Button */}
              <TouchableOpacity
                style={[
                  styles.scanBannerBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 1, 143, 0.14)' : 'rgba(255, 1, 143, 0.08)',
                    borderColor: theme.neonPink,
                  },
                ]}
                onPress={() => setScannerTarget('invoice')}
                disabled={isAnalyzingAi}
                activeOpacity={0.85}
              >
                {isAnalyzingAi ? (
                  <ActivityIndicator size="small" color={theme.neonPink} />
                ) : (
                  <Ionicons name="scan-outline" size={22} color={theme.neonPink} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scanBannerTitle, { color: theme.textPrimary }]}>
                    {isAnalyzingAi ? 'Vytěžuji údaje z faktury...' : 'Naskenovat fakturu pomocí AI'}
                  </Text>
                  <Text style={[styles.scanBannerSub, { color: theme.textSecondary }]}>
                    Vyfoťte fakturu a Gemini automaticky předvyplní formulář
                  </Text>
                </View>
                <Ionicons name="camera-outline" size={20} color={theme.neonPink} />
              </TouchableOpacity>

              {serviceInvoiceScan && (
                <View style={styles.scanPreviewRow}>
                  <Image source={{ uri: serviceInvoiceScan.uri }} style={styles.scanThumb} />
                  <Text style={[styles.scanPreviewText, { color: theme.textSecondary }]}>
                    Faktura přiložena k záznamu
                  </Text>
                  <TouchableOpacity onPress={() => setServiceInvoiceScan(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Název úkonu *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={serviceTitle}
                  onChangeText={setServiceTitle}
                  placeholder="např. Výměna oleje a filtrů"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Datum</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={serviceDate}
                  onChangeText={(t) => setServiceDate(formatLogicalDate(t, serviceDate))}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="např. 12.10.2026"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Stav tachometru (km) *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={serviceOdometer}
                  onChangeText={(t) => setServiceOdometer(formatOdometer(t))}
                  keyboardType="number-pad"
                  placeholder="např. 184 500"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Provedl / autoservis</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={servicePerformer}
                  onChangeText={setServicePerformer}
                  placeholder="např. Vlastní úkon nebo Autoservis Novák"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Cena materiálu a dílů (Kč)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={serviceMaterialPrice}
                  onChangeText={setServiceMaterialPrice}
                  keyboardType="numeric"
                  placeholder="např. 1100"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Cena práce mechanika (Kč)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={serviceLaborPrice}
                  onChangeText={setServiceLaborPrice}
                  keyboardType="numeric"
                  placeholder="např. 500"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Použité díly a popis</Text>
                <TextInput
                  style={[
                    styles.modalInputMulti,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={servicePartsText}
                  onChangeText={setServicePartsText}
                  multiline
                  numberOfLines={3}
                  placeholder="např. Total Quartz 10W-40 (4l), Olejový filtr Mann"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: theme.cardBorder }]}
                onPress={() => setServiceModalVisible(false)}
                disabled={isSavingService}
              >
                <Text style={[styles.modalButtonCancelText, { color: theme.textSecondary }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSubmit, { backgroundColor: theme.neonPink }]}
                onPress={handleSaveService}
                disabled={isSavingService}
              >
                {isSavingService ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>Uložit úkon</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Přidat díl na Blacklist */}
      <Modal visible={blacklistModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Přidat díl na Blacklist</Text>
              <TouchableOpacity onPress={() => setBlacklistModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Název dílu *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={blPartName}
                  onChangeText={setBlPartName}
                  placeholder="např. Zapalovací rampa (cívka)"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Značka a kód dílu *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={blBrand}
                  onChangeText={setBlBrand}
                  placeholder="např. Starline ED ST332"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Důvod nekompatibility / závady *</Text>
                <TextInput
                  style={[
                    styles.modalInputMulti,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={blReason}
                  onChangeText={setBlReason}
                  multiline
                  numberOfLines={3}
                  placeholder="např. Způsobovala nepravidelný chod a vynechávání zážehů"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={[styles.photoPickerBtn, { borderColor: theme.cardBorder, backgroundColor: theme.inputBg }]}
                onPress={() => setScannerTarget('blacklist')}
              >
                <Ionicons name="camera-outline" size={20} color={theme.neonPink} />
                <Text style={[styles.photoPickerText, { color: theme.textPrimary }]}>
                  {blPhotoScan ? 'Změnit fotografii dílu' : 'Přidat fotodokumentaci dílu (volitelné)'}
                </Text>
              </TouchableOpacity>

              {blPhotoScan && (
                <View style={styles.scanPreviewRow}>
                  <Image source={{ uri: blPhotoScan.uri }} style={styles.scanThumb} />
                  <Text style={[styles.scanPreviewText, { color: theme.textSecondary }]}>
                    Fotografie dílu připravena
                  </Text>
                  <TouchableOpacity onPress={() => setBlPhotoScan(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: theme.cardBorder }]}
                onPress={() => setBlacklistModalVisible(false)}
                disabled={isSavingBlacklist}
              >
                <Text style={[styles.modalButtonCancelText, { color: theme.textSecondary }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSubmit, { backgroundColor: theme.danger }]}
                onPress={handleSaveBlacklist}
                disabled={isSavingBlacklist}
              >
                {isSavingBlacklist ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>Přidat na Blacklist</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Přidat dokument do archivu (FR3 & FR4 STK) */}
      <Modal visible={docModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Přidat doklad do archivu</Text>
              <TouchableOpacity onPress={() => setDocModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Typ dokumentu</Text>
              <View style={styles.docTypeGrid}>
                {DOC_TYPE_OPTIONS.map((opt) => {
                  const selected = docType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.docTypeChip,
                        {
                          backgroundColor: selected ? theme.neonPink : theme.inputBg,
                          borderColor: selected ? theme.neonPink : theme.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        setDocType(opt.value);
                        setDocTitle(opt.label);
                      }}
                    >
                      <Ionicons name={opt.icon} size={15} color={selected ? '#FFFFFF' : theme.textSecondary} />
                      <Text
                        style={[
                          styles.docTypeChipText,
                          { color: selected ? '#FFFFFF' : theme.textSecondary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[
                  styles.scanBannerBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255, 1, 143, 0.14)' : 'rgba(255, 1, 143, 0.08)',
                    borderColor: theme.neonPink,
                  },
                ]}
                onPress={() => setScannerTarget('document')}
              >
                <Ionicons name="camera-outline" size={22} color={theme.neonPink} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scanBannerTitle, { color: theme.textPrimary }]}>
                    {docScan ? 'Změnit snímek dokumentu' : 'Vyfotit nebo nahrát dokument *'}
                  </Text>
                  <Text style={[styles.scanBannerSub, { color: theme.textSecondary }]}>
                    Bezpečné uložení do soukromého cloudového archivu
                  </Text>
                </View>
              </TouchableOpacity>

              {docScan && (
                <View style={styles.scanPreviewRow}>
                  <Image source={{ uri: docScan.uri }} style={styles.scanThumb} />
                  <Text style={[styles.scanPreviewText, { color: theme.textSecondary }]}>
                    Snímek připraven k uložení
                  </Text>
                  <TouchableOpacity onPress={() => setDocScan(null)} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              )}

              {docType === 'stk_protocol' && docScan && (
                <TouchableOpacity
                  style={[styles.photoPickerBtn, { borderColor: theme.neonPink, backgroundColor: theme.badgeBg }]}
                  onPress={handleAnalyzeStkDocument}
                  disabled={isAnalyzingAi}
                >
                  {isAnalyzingAi ? (
                    <ActivityIndicator size="small" color={theme.neonPink} />
                  ) : (
                    <Ionicons name="sparkles-outline" size={19} color={theme.neonPink} />
                  )}
                  <Text style={[styles.photoPickerText, { color: theme.neonPink }]}>
                    {isAnalyzingAi ? 'Analyzuji protokol STK...' : 'Vytěžit platnost STK a VIN (AI)'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Název dokumentu *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={docTitle}
                  onChangeText={setDocTitle}
                  placeholder="např. Velký technický průkaz"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Datum expirace (volitelné)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={docExpirationDate}
                  onChangeText={(t) => setDocExpirationDate(formatLogicalDate(t, docExpirationDate))}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholder="např. 15.05.2028"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Poznámka (volitelné)</Text>
                <TextInput
                  style={[
                    styles.modalInputMulti,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder, color: theme.textPrimary },
                  ]}
                  value={docNotes}
                  onChangeText={setDocNotes}
                  multiline
                  numberOfLines={2}
                  placeholder="např. Číslo smlouvy, VIN nebo poznámka"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: theme.cardBorder }]}
                onPress={() => setDocModalVisible(false)}
                disabled={isSavingDoc}
              >
                <Text style={[styles.modalButtonCancelText, { color: theme.textSecondary }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSubmit, { backgroundColor: theme.neonPink }]}
                onPress={handleSaveDocument}
                disabled={isSavingDoc}
              >
                {isSavingDoc ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>Uložit doklad</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Camera / Gallery Scanner Modal */}
      <DocumentScannerModal
        visible={scannerTarget !== null}
        title={
          scannerTarget === 'invoice'
            ? 'Skenovat fakturu (AI)'
            : scannerTarget === 'blacklist'
              ? 'Vyfotit závadný díl'
              : 'Skenovat doklad vozidla'
        }
        onClose={() => setScannerTarget(null)}
        onCapture={handleScannerCapture}
      />

      {/* Fullscreen Image Preview Modal */}
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
  },
  ambientTopGlow: {
    position: 'absolute',
    top: -60,
    left: '20%',
    width: 220,
    height: 160,
    borderRadius: 110,
    backgroundColor: '#2A0C62',
    opacity: 0.45,
  },
  ambientRightGlow: {
    position: 'absolute',
    top: 120,
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
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 18,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 5,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  contentSection: {
    gap: 14,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 290,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  docTypeTag: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  badgeSuccess: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachmentChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  partsList: {
    marginBottom: 12,
    gap: 4,
  },
  partItem: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  costLabel: {
    fontSize: 12,
    flex: 1,
  },
  totalCost: {
    fontSize: 17,
    fontWeight: '900',
  },
  blacklistWarningCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  blacklistWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  blacklistBrand: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  blacklistReason: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  modalBody: {
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  modalInputMulti: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  scanBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  scanBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  scanBannerSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  scanPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  scanThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  scanPreviewText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  photoPickerText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  docTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  docTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  docTypeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    height: 50,
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
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  modalButtonSubmitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
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
});
