import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme } from '../constants/theme';

interface OdometerFormattedInputProps {
  label: string;
  value: string;
  onChangeText: (formattedText: string) => void;
  theme: ColorTheme;
  isDark: boolean;
  placeholder?: string;
  required?: boolean;
}

/**
 * Format odometer with space thousands separators (e.g. 1000 -> 1 000)
 */
export function formatOdometer(input: string): string {
  const clean = input.replace(/\D/g, '');
  if (!clean) return '';
  const limited = clean.slice(0, 9);
  const normalized = limited.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function parseOdometer(input: string): number {
  return parseInt(input.replace(/\s/g, ''), 10) || 0;
}

export const OdometerFormattedInput: React.FC<OdometerFormattedInputProps> = ({
  label,
  value,
  onChangeText,
  theme,
  isDark,
  placeholder = 'např. 145 000',
  required = false,
}) => {
  const handleChange = (text: string) => {
    const formatted = formatOdometer(text);
    onChangeText(formatted);
  };

  const setPreset = (km: number) => {
    onChangeText(formatOdometer(String(km)));
  };

  const rawNum = parseOdometer(value);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label} {required ? '*' : ''}
        </Text>
        {value.length > 0 && (
          <TouchableOpacity
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={() => onChangeText('')}
          >
            <Text style={[styles.clearBtn, { color: theme.textSecondary }]}>Vymazat</Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.inputBg,
            borderColor: theme.border,
          },
        ]}
      >
        <Ionicons
          name="speedometer-outline"
          size={18}
          color={theme.accent}
          style={styles.icon}
        />

        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
        />

        <View
          style={[
            styles.unitBadge,
            {
              backgroundColor: isDark ? '#261F38' : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.unitText, { color: theme.textSecondary }]}>km</Text>
        </View>
      </View>

      {/* Quick shortcuts for mileage */}
      <View style={styles.presetsRow}>
        <TouchableOpacity
          onPress={() => setPreset(0)}
          style={[
            styles.presetChip,
            {
              backgroundColor: isDark ? '#231E33' : '#E2E8F0',
              borderColor: isDark ? '#3D3156' : '#CBD5E1',
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, { color: theme.textPrimary }]}>0 km (Nové)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPreset(50000)}
          style={[
            styles.presetChip,
            {
              backgroundColor: isDark ? '#231E33' : '#E2E8F0',
              borderColor: isDark ? '#3D3156' : '#CBD5E1',
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, { color: theme.textPrimary }]}>50 000 km</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPreset(150000)}
          style={[
            styles.presetChip,
            {
              backgroundColor: isDark ? '#231E33' : '#E2E8F0',
              borderColor: isDark ? '#3D3156' : '#CBD5E1',
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, { color: theme.textPrimary }]}>150 000 km</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  clearBtn: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  unitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
