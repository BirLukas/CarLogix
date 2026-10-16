import React from 'react';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

interface StatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({ title, value, subtitle }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#161320' : theme.surface, borderColor: isDark ? '#2C2242' : theme.border }]}>
      <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
      <Text style={[styles.value, { color: theme.textPrimary }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 6,
    width: '100%',
  },
  title: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12.5,
    marginTop: 4,
    color: '#FF018F',
    fontWeight: '600',
  },
});

