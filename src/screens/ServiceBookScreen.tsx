import React, { useState, useEffect, useCallback } from 'react';
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
import { ServiceBookService } from '../services/records';
import { ServiceEntry, BlacklistItem } from '../types';

export const ServiceBookScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<'history' | 'blacklist'>('history');
  const [serviceEntries, setServiceEntries] = useState<ServiceEntry[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal: Add Service Entry
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceOdometer, setServiceOdometer] = useState('');
  const [servicePerformer, setServicePerformer] = useState('');
  const [servicePartsText, setServicePartsText] = useState('');
  const [serviceMaterialPrice, setServiceMaterialPrice] = useState('');
  const [serviceLaborPrice, setServiceLaborPrice] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);

  // Modal: Add Blacklist Item
  const [blacklistModalVisible, setBlacklistModalVisible] = useState(false);
  const [blPartName, setBlPartName] = useState('');
  const [blBrand, setBlBrand] = useState('');
  const [blReason, setBlReason] = useState('');
  const [isSavingBlacklist, setIsSavingBlacklist] = useState(false);

  const getTodayFormatted = () => {
    const today = new Date();
    return `${today.getDate()}. ${today.getMonth() + 1}. ${today.getFullYear()}`;
  };

  const loadData = useCallback(async () => {
    try {
      const [services, bl] = await Promise.all([
        ServiceBookService.getEntries(),
        ServiceBookService.getBlacklist(),
      ]);
      setServiceEntries(services);
      setBlacklist(bl);
    } catch (err) {
      console.error('Chyba při načítání servisních dat:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openAddModal = () => {
    if (activeTab === 'history') {
      setServiceTitle('');
      setServiceDate(getTodayFormatted());
      setServiceOdometer('');
      setServicePerformer('Vlastní úkon');
      setServicePartsText('');
      setServiceMaterialPrice('');
      setServiceLaborPrice('');
      setServiceModalVisible(true);
    } else {
      setBlPartName('');
      setBlBrand('');
      setBlReason('');
      setBlacklistModalVisible(true);
    }
  };

  const handleSaveService = async () => {
    if (!serviceTitle.trim()) {
      Alert.alert('Chyba', 'Zadejte název servisního úkonu.');
      return;
    }

    const odo = parseInt(serviceOdometer.replace(/\s/g, ''), 10);
    if (isNaN(odo) || odo < 0) {
      Alert.alert('Chyba', 'Zadejte platný stav tachometru.');
      return;
    }

    const matPrice = parseFloat(serviceMaterialPrice.replace(/\s/g, '').replace(',', '.')) || 0;
    const labPrice = parseFloat(serviceLaborPrice.replace(/\s/g, '').replace(',', '.')) || 0;
    const totalPrice = Math.round(matPrice + labPrice);

    setIsSavingService(true);
    try {
      await ServiceBookService.addEntry({
        title: serviceTitle.trim(),
        date: serviceDate.trim() || getTodayFormatted(),
        odometer: odo,
        performer: servicePerformer.trim() || 'Vlastní úkon',
        partsSummary: servicePartsText.trim(),
        materialPriceCzK: Math.round(matPrice),
        laborPriceCzK: Math.round(labPrice),
        totalPriceCzK: totalPrice,
      });
      setServiceModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit servisní záznam.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = (id: string) => {
    Alert.alert('Smazat záznam', 'Opravdu chcete tento servisní záznam odstranit?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          await ServiceBookService.deleteEntry(id);
          loadData();
        },
      },
    ]);
  };

  const handleSaveBlacklist = async () => {
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
      await ServiceBookService.addBlacklistItem({
        partName: blPartName.trim(),
        brand: blBrand.trim(),
        reason: blReason.trim(),
      });
      setBlacklistModalVisible(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se přidat díl na blacklist.');
    } finally {
      setIsSavingBlacklist(false);
    }
  };

  const handleDeleteBlacklist = (id: string) => {
    Alert.alert('Odebrat z blacklistu', 'Opravdu chcete odebrat tento díl z blacklistu?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Odebrat',
        style: 'destructive',
        onPress: async () => {
          await ServiceBookService.deleteBlacklistItem(id);
          loadData();
        },
      },
    ]);
  };

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
            <Text style={[styles.title, { color: theme.textPrimary }]}>Servis & Údržba</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Digitální servisní kniha a díly
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

        {/* Tab switcher: Historie vs Blacklist */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === 'history' && { backgroundColor: theme.accent },
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="construct-outline"
              size={18}
              color={activeTab === 'history' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'history' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Servisní historie {serviceEntries.length > 0 ? `(${serviceEntries.length})` : ''}
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
              size={18}
              color={activeTab === 'blacklist' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === 'blacklist' ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              Blacklist dílů ({blacklist.length})
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 24 }} />
        ) : activeTab === 'history' ? (
          <View style={styles.contentSection}>
            {serviceEntries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="construct-outline" size={40} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Žádné servisní záznamy</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Zatím zde nemáte evidovány žádné servisní úkony. Klepnutím na tlačítko + přidejte novou servisní prohlídku nebo opravu.
                </Text>
              </View>
            ) : (
              serviceEntries.map((item) => (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                        {item.date} • {item.odometer.toLocaleString('cs-CZ')} km • {item.performer || 'Vlastní úkon'}
                      </Text>
                    </View>
                    <View style={styles.cardHeaderRight}>
                      <View style={[styles.badgeSuccess, { backgroundColor: theme.success + '20' }]}>
                        <Text style={[styles.badgeText, { color: theme.success }]}>Hotovo</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteService(item.id)}
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

                  <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                    <Text style={[styles.costLabel, { color: theme.textSecondary }]}>
                      Materiál: {(item.materialPriceCzK || 0).toLocaleString('cs-CZ')} Kč | Práce: {(item.laborPriceCzK || 0).toLocaleString('cs-CZ')} Kč
                    </Text>
                    <Text style={[styles.totalCost, { color: theme.textPrimary }]}>
                      {item.totalPriceCzK.toLocaleString('cs-CZ')} Kč
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={styles.contentSection}>
            <View style={[styles.blacklistWarningCard, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}>
              <Ionicons name="information-circle" size={22} color={theme.danger} />
              <Text style={[styles.blacklistWarningText, { color: theme.danger }]}>
                Díly na tomto seznamu se neosvědčily nebo nepasovaly. AI vyhledávač vás před jejich koupí automaticky varuje.
              </Text>
            </View>

            {blacklist.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="shield-checkmark-outline" size={40} color={theme.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Blacklist je prázdný</Text>
                <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                  Nemáte evidovány žádné nevyhovující díly. Nekvalitní nebo nepasující díly můžete přidat tlačítkem + výše.
                </Text>
              </View>
            ) : (
              blacklist.map((item) => (
                <View
                  key={item.id}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.partName}</Text>
                      <Text style={[styles.blacklistBrand, { color: theme.danger }]}>Značka / kód: {item.brand}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteBlacklist(item.id)}
                      hitSlop={10}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.blacklistReason, { color: theme.textSecondary }]}>
                    Důvod: {item.reason}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Přidat servisní záznam */}
      <Modal visible={serviceModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Přidat servisní záznam</Text>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Název úkonu *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={serviceDate}
                  onChangeText={setServiceDate}
                  placeholder="např. 12. 10. 2026"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Stav tachometru (km) *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={serviceOdometer}
                  onChangeText={setServiceOdometer}
                  keyboardType="numeric"
                  placeholder="např. 184500"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Provedl / autoservis</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                style={[styles.modalButtonCancel, { borderColor: theme.border }]}
                onPress={() => setServiceModalVisible(false)}
                disabled={isSavingService}
              >
                <Text style={[styles.modalButtonCancelText, { color: theme.textSecondary }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSubmit, { backgroundColor: theme.accent }]}
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
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
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
                    { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary },
                  ]}
                  value={blReason}
                  onChangeText={setBlReason}
                  multiline
                  numberOfLines={3}
                  placeholder="např. Způsobovala nepravidelný chod a vynechávání zážehů"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: theme.border }]}
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentSection: {
    gap: 12,
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
    maxWidth: 290,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
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
    fontSize: 16,
    fontWeight: '700',
  },
  cardMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeSuccess: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    paddingTop: 10,
  },
  costLabel: {
    fontSize: 12,
    flex: 1,
  },
  totalCost: {
    fontSize: 16,
    fontWeight: '800',
  },
  blacklistWarningCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  blacklistWarningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
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
  modalInputMulti: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 15,
    textAlignVertical: 'top',
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
