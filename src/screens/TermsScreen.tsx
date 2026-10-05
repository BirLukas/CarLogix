import React from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

export const TermsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView edges={['bottom']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Podmínky používání a ochrana soukromí
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            V souladu se směrnicí maturitních prací v oboru IT
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.accent }]}>1. Základní ustanovení</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Aplikace CarLogix je vyvíjena jako maturitní práce pro správu provozních nákladů, telemetrie a diagnostiky vozidla. Používáním této aplikace souhlasíte s těmito podmínkami.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>2. Zpracování a ochrana osobních údajů</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Aplikace vyžaduje registraci prostřednictvím e-mailové adresy. Pro zajištění bezpečnosti databáze je přístup podmíněn ověřením e-mailové adresy. Veškerá uživatelská data a záznamy o vozidlech jsou uložena v zabezpečeném cloudovém úložišti chráněném politikami Row Level Security (RLS).
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>3. Diagnostická data a OBD-II</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Telemetrická data vyčítaná z řídicí jednotky motoru (ECU) přes adaptér ELM327 BLE slouží výhradně pro informativní a vzdělávací účely. Uživatel odpovídá za bezpečné používání aplikace tak, aby nebyl rozptylován při řízení motorového vozidla.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>4. Umělá inteligence (Google Gemini)</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Multimodální analýza fotografií faktur a vyhledávání náhradních dílů využívá cloudové zpracování prostřednictvím Google Gemini API. Zpracování probíhá přes zabezpečenou proxy vrstvu bez ukládání citlivých platebních údajů.
          </Text>

          <Text style={[styles.sectionTitle, { color: theme.accent }]}>5. Doba dostupnosti a archivace</Text>
          <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
            Architektura systému je navržena s ohledem na udržitelnost a dostupnost po dobu minimálně 5 let od data maturitní obhajoby.
          </Text>
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
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
});
