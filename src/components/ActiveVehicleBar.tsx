import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useVehicle } from '../context/VehicleContext';

export const ActiveVehicleBar: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { vehicles, selectedVehicle, setSelectedVehicle } = useVehicle();

  if (!selectedVehicle) {
    return (
      <View
        style={[
          styles.emptyBanner,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <Ionicons name="car-outline" size={18} color={theme.warning} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Žádné vozidlo v garáži — nejprve přidejte auto v záložce Garáž.
        </Text>
      </View>
    );
  }

  if (vehicles.length === 1) {
    return (
      <View
        style={[
          styles.singleBanner,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <Ionicons name="car-sport" size={16} color={theme.accent} />
        <Text style={[styles.singleText, { color: theme.textPrimary }]} numberOfLines={1}>
          {selectedVehicle.brand} {selectedVehicle.model}
        </Text>
        <Text style={[styles.plateText, { color: theme.textSecondary }]}>
          {selectedVehicle.licensePlate}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsContainer}
      style={styles.chipsScroll}
    >
      {vehicles.map((v) => {
        const isActive = v.id === selectedVehicle.id;
        return (
          <TouchableOpacity
            key={v.id}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? theme.accent : theme.card,
                borderColor: isActive ? theme.accent : theme.cardBorder,
              },
            ]}
            onPress={() => setSelectedVehicle(v)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="car-sport"
              size={15}
              color={isActive ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: isActive ? '#FFFFFF' : theme.textPrimary },
              ]}
            >
              {v.brand} {v.model} ({v.licensePlate})
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  emptyText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
  },
  singleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  singleText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
  },
  plateText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    marginBottom: 14,
    flexGrow: 0,
  },
  chipsContainer: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
