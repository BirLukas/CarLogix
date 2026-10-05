import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

export const ServiceBookScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<'history' | 'blacklist'>('history');

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          >
            <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
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
              Servisní historie
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
              Blacklist dílů (2)
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'history' ? (
          <View style={styles.contentSection}>
            {/* Service Record 1 */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Výměna oleje a filtrů</Text>
                  <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                    12. 6. 2026 • 179 000 km • Vlastní úkon
                  </Text>
                </View>
                <View style={[styles.badgeSuccess, { backgroundColor: theme.success + '20' }]}>
                  <Text style={[styles.badgeText, { color: theme.success }]}>Hotovo</Text>
                </View>
              </View>

              <View style={styles.partsList}>
                <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                  • Total Quartz 7000 10W-40 (4 l) – 680 Kč
                </Text>
                <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                  • Olejový filtr Mann W 712/8 – 180 Kč
                </Text>
                <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                  • Vzduchový filtr Bosch – 250 Kč
                </Text>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Materiál: 1 110 Kč | Práce: 0 Kč</Text>
                <Text style={[styles.totalCost, { color: theme.textPrimary }]}>1 110 Kč</Text>
              </View>
            </View>

            {/* Service Record 2 */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Přední brzdy a brzdová kapalina</Text>
                  <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                    24. 2. 2026 • 174 800 km • Autoservis Novák
                  </Text>
                </View>
                <View style={[styles.badgeSuccess, { backgroundColor: theme.success + '20' }]}>
                  <Text style={[styles.badgeText, { color: theme.success }]}>Hotovo</Text>
                </View>
              </View>

              <View style={styles.partsList}>
                <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                  • Kotouče Brembo 247 mm (pár) – 1 890 Kč
                </Text>
                <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                  • Destičky Brembo P 61 066 – 820 Kč
                </Text>
                <Text style={[styles.partItem, { color: theme.textSecondary }]}>
                  • Práce mechanika – 1 200 Kč
                </Text>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                <Text style={[styles.costLabel, { color: theme.textSecondary }]}>Materiál: 2 710 Kč | Práce: 1 200 Kč</Text>
                <Text style={[styles.totalCost, { color: theme.textPrimary }]}>3 910 Kč</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.contentSection}>
            <View style={[styles.blacklistWarningCard, { backgroundColor: theme.danger + '15', borderColor: theme.danger }]}>
              <Ionicons name="information-circle" size={22} color={theme.danger} />
              <Text style={[styles.blacklistWarningText, { color: theme.danger }]}>
                Díly na tomto seznamu se neosvědčily nebo nepasovaly. AI vyhledávač vás před jejich koupí automaticky varuje.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Zapalovací rampa (cívka)</Text>
                  <Text style={[styles.blacklistBrand, { color: theme.danger }]}>Značka: Starline (ED ST332)</Text>
                </View>
              </View>
              <Text style={[styles.blacklistReason, { color: theme.textSecondary }]}>
                Důvod: Způsobovala nepravidelný chod motoru a vynechávání zážehů (chyba P0300). Vyměněno za originál Valeo.
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Přední brzdové kotouče</Text>
                  <Text style={[styles.blacklistBrand, { color: theme.danger }]}>Značka: Maxgear (19-0112)</Text>
                </View>
              </View>
              <Text style={[styles.blacklistReason, { color: theme.textSecondary }]}>
                Důvod: Zvlnění po pouhých 3 000 km, vibrace do volantu při prudším brzdění.
              </Text>
            </View>
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
});
