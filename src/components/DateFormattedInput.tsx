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

export interface DatePreset {
  label: string;
  addYears?: number;
  addMonths?: number;
  isToday?: boolean;
}

interface DateFormattedInputProps {
  label: string;
  value: string;
  onChangeDate: (date: string) => void;
  theme: ColorTheme;
  isDark: boolean;
  presets?: DatePreset[];
  placeholder?: string;
  required?: boolean;
}

/**
 * Format and logically validate Czech date format DD.MM.YYYY
 * Strict rules:
 * - Day cannot be 00 or >31
 * - Month cannot be 00 or >12 (rejects 13+, 00)
 * - Leap year and days per month respected
 * - Year must start with 19xx or 20xx
 */
export function formatLogicalDate(input: string, prev: string = ''): string {
  // If user is deleting
  if (input.length < prev.length) {
    if (prev.endsWith('.') && input === prev.slice(0, -1)) {
      return input.slice(0, -1);
    }
    return input;
  }

  // Handle ISO paste like "2026-11-20"
  if (/^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    const [y, m, d] = input.trim().split('-');
    return `${d}.${m}.${y}`;
  }

  const rawDigits = input.replace(/\D/g, '');
  if (!rawDigits) return '';

  let day = '';
  let month = '';
  let year = '';

  // Process day
  const d1 = rawDigits[0];
  let digitIdx = 0;

  if (parseInt(d1, 10) > 3) {
    day = '0' + d1;
    digitIdx = 1;
  } else {
    day = d1;
    digitIdx = 1;
    if (rawDigits.length > 1) {
      const d2 = rawDigits[1];
      if (d1 === '0' && d2 === '0') {
        // Day 00 not allowed
        digitIdx = 1;
      } else if (d1 === '3' && parseInt(d2, 10) > 1) {
        // Day 32+ not allowed
        digitIdx = 1;
      } else {
        day = d1 + d2;
        digitIdx = 2;
      }
    }
  }

  // Process month
  if (day.length === 2 && rawDigits.length > digitIdx) {
    const m1 = rawDigits[digitIdx];
    if (parseInt(m1, 10) > 1) {
      month = '0' + m1;
      digitIdx += 1;
    } else {
      month = m1;
      digitIdx += 1;
      if (rawDigits.length > digitIdx) {
        const m2 = rawDigits[digitIdx];
        if (m1 === '0' && m2 === '0') {
          // Month 00 not allowed
        } else if (m1 === '1' && parseInt(m2, 10) > 2) {
          // Month 13+ not allowed! Strictly enforced
        } else {
          month = m1 + m2;
          digitIdx += 1;
        }
      }
    }

    // Process year
    if (month.length === 2) {
      // Clamping days according to month
      const dNum = parseInt(day, 10);
      const mNum = parseInt(month, 10);
      if (mNum === 2 && dNum > 29) {
        day = '29';
      } else if ([4, 6, 9, 11].includes(mNum) && dNum > 30) {
        day = '30';
      }

      if (rawDigits.length > digitIdx) {
        const remaining = rawDigits.slice(digitIdx);
        const y1 = remaining[0];
        if (y1 === '1' || y1 === '2') {
          year = y1 + remaining.slice(1, 4);
        }
      }
    }
  }

  if (year.length > 0) return `${day}.${month}.${year}`;
  if (month.length === 2) return `${day}.${month}.`;
  if (month.length === 1) return `${day}.${month}`;
  if (day.length === 2) return `${day}.`;
  return day;
}

export function isValidDate(dateStr: string): boolean {
  if (!dateStr || dateStr.trim().length === 0) return false;
  const match = dateStr.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return false;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDays = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= maxDays;
}

/**
 * Converts Czech date (DD.MM.YYYY) to ISO (YYYY-MM-DD) for database storage
 */
export function czechDateToIso(czechDate?: string | null): string | undefined {
  if (!czechDate || !czechDate.trim()) return undefined;
  const trimmed = czechDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return undefined;
}

/**
 * Converts ISO date (YYYY-MM-DD) to Czech date (DD.MM.YYYY) for display
 */
export function isoToCzechDate(dateStr?: string | null): string {
  if (!dateStr || !dateStr.trim()) return '';
  const trimmed = dateStr.trim();
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}.${m}.${y}`;
  }
  return trimmed;
}

export const DateFormattedInput: React.FC<DateFormattedInputProps> = ({
  label,
  value,
  onChangeDate,
  theme,
  isDark,
  presets,
  placeholder = 'DD.MM.RRRR',
  required = false,
}) => {
  const handleChangeText = (text: string) => {
    const formatted = formatLogicalDate(text, value);
    onChangeDate(formatted);
  };

  const applyPreset = (preset: DatePreset) => {
    const d = new Date();
    if (preset.addYears) {
      d.setFullYear(d.getFullYear() + preset.addYears);
    }
    if (preset.addMonths) {
      d.setMonth(d.getMonth() + preset.addMonths);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    onChangeDate(`${day}.${month}.${year}`);
  };

  const isComplete = value.length === 10;
  const isValid = isValidDate(value);
  const hasError = isComplete && !isValid;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {label} {required ? '*' : ''}
        </Text>
        {value.length > 0 && (
          <TouchableOpacity
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={() => onChangeDate('')}
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
            borderColor: hasError
              ? theme.danger
              : isValid
              ? theme.success
              : theme.border,
          },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={isValid ? theme.success : theme.textSecondary}
          style={styles.icon}
        />

        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          maxLength={10}
        />

        {isValid ? (
          <Ionicons name="checkmark-circle" size={18} color={theme.success} />
        ) : hasError ? (
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
        ) : null}
      </View>

      {/* Preset quick buttons if provided */}
      {presets && presets.length > 0 && (
        <View style={styles.presetsRow}>
          {presets.map((p, idx) => (
            <TouchableOpacity
              key={`preset-${idx}`}
              onPress={() => applyPreset(p)}
              style={[
                styles.presetChip,
                {
                  backgroundColor: isDark ? '#231E33' : '#E2E8F0',
                  borderColor: isDark ? '#3D3156' : '#CBD5E1',
                },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, { color: theme.textPrimary }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {hasError ? (
        <Text style={[styles.helperError, { color: theme.danger }]}>
          Neplatné datum (zkontrolujte den a měsíc)
        </Text>
      ) : (
        <Text style={[styles.helperNote, { color: theme.textSecondary }]}>
          Formát: DD.MM.RRRR (např. 24.11.2026)
        </Text>
      )}
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
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  helperNote: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  helperError: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    paddingHorizontal: 2,
  },
});
