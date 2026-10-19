import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorTheme } from '../constants/theme';

interface CzechPlateInputProps {
  value: string;
  onChangeText: (text: string) => void;
  theme: ColorTheme;
  isDark: boolean;
}

/**
 * Czech Registration Plate Input (Česká SPZ)
 * - Maximum 8 kolonek according to Czech legislation (7 standard, 8 custom)
 * - Authentic EU strip (CZ)
 * - Visual boxes (kolonky) with active cursor position indicator
 * - Real-time validation and character counter
 */
export const CzechPlateInput: React.FC<CzechPlateInputProps> = ({
  value,
  onChangeText,
  theme,
  isDark,
}) => {
  const inputRef = useRef<TextInput>(null);

  // Normalize: remove non-alphanumeric, max 8 chars, uppercase
  const rawValue = (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);

  const handleTextChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    onChangeText(cleaned);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  // Group 1: 3 characters (e.g. 1AB)
  const group1 = [0, 1, 2];
  // Group 2: 5 characters (4 standard + 1 custom, e.g. 2345 + X)
  const group2 = [3, 4, 5, 6, 7];

  const renderSlot = (index: number, isOptional = false) => {
    const char = rawValue[index] || '';
    const isCurrentActive = rawValue.length === index;
    const isFilled = Boolean(char);

    return (
      <View
        key={`slot-${index}`}
        style={[
          styles.slotBox,
          {
            backgroundColor: isDark ? '#1E1B2E' : '#FFFFFF',
            borderColor: isCurrentActive
              ? theme.accent
              : isFilled
              ? isDark
                ? '#52436A'
                : '#94A3B8'
              : isOptional
              ? isDark
                ? '#2A243D'
                : '#E2E8F0'
              : isDark
              ? '#382F52'
              : '#CBD5E1',
            borderStyle: isFilled ? 'solid' : isOptional ? 'dashed' : 'solid',
          },
        ]}
      >
        {isFilled ? (
          <Text
            style={[
              styles.slotChar,
              { color: isDark ? '#FFFFFF' : '#0F172A' },
            ]}
          >
            {char}
          </Text>
        ) : isCurrentActive ? (
          <View style={[styles.cursorIndicator, { backgroundColor: theme.accent }]} />
        ) : (
          <Text
            style={[
              styles.slotPlaceholder,
              { color: isDark ? '#4B3F68' : '#CBD5E1' },
            ]}
          >
            {index + 1}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handleContainerPress}
        style={[
          styles.plateContainer,
          {
            backgroundColor: isDark ? '#14121F' : '#F8FAFC',
            borderColor: rawValue.length >= 7 ? (isDark ? '#553C8B' : '#94A3B8') : isDark ? '#2D2345' : '#CBD5E1',
          },
        ]}
      >
        {/* EU Blue Band */}
        <View style={styles.euBand}>
          <View style={styles.starsRow}>
            <Ionicons name="star" size={5} color="#FBBF24" />
            <Ionicons name="star" size={5} color="#FBBF24" />
          </View>
          <Text style={styles.euText}>CZ</Text>
          <View style={styles.starsRow}>
            <Ionicons name="star" size={5} color="#FBBF24" />
            <Ionicons name="star" size={5} color="#FBBF24" />
          </View>
        </View>

        {/* 8 Kolonek (Character Slots) */}
        <View style={styles.slotsArea}>
          {/* First group (3 kolonek) */}
          <View style={styles.slotsRow}>
            {group1.map((idx) => renderSlot(idx))}
          </View>

          {/* Official STK / SME sticker space separator */}
          <View style={styles.separatorContainer}>
            <View style={[styles.stickerDot, { backgroundColor: '#DC2626' }]} />
            <View style={[styles.stickerDot, { backgroundColor: '#16A34A', marginTop: 4 }]} />
          </View>

          {/* Second group (4 standard + 1 custom = 5 kolonek) */}
          <View style={styles.slotsRow}>
            {group2.map((idx) => renderSlot(idx, idx === 7))}
          </View>
        </View>

        {/* Hidden backing TextInput */}
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={rawValue}
          onChangeText={handleTextChange}
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          caretHidden
        />
      </TouchableOpacity>

      {/* Plate Status & Helper Note */}
      <View style={styles.helperRow}>
        <View style={styles.statusBadge}>
          {rawValue.length === 8 ? (
            <View style={styles.statusInner}>
              <Ionicons name="sparkles" size={13} color="#F59E0B" />
              <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                SPZ na přání (max. 8 kolonek)
              </Text>
            </View>
          ) : rawValue.length === 7 ? (
            <View style={styles.statusInner}>
              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
              <Text style={[styles.statusText, { color: '#10B981' }]}>
                Standardní CZ SPZ (7 kolonek)
              </Text>
            </View>
          ) : (
            <View style={styles.statusInner}>
              <Ionicons name="information-circle-outline" size={13} color={theme.textSecondary} />
              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                {rawValue.length === 0
                  ? 'Zadejte SPZ (7 znaků, na přání 8)'
                  : `Zbývá ${7 - rawValue.length} do standardní SPZ`}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.counterText, { color: theme.textSecondary }]}>
          {rawValue.length} / 8 kolonek
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  plateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  euBand: {
    width: 28,
    height: '100%',
    backgroundColor: '#1E3A8A',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
  },
  euText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  slotsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    gap: 5,
  },
  slotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  separatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  stickerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.75,
  },
  slotBox: {
    width: 27,
    height: 38,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotChar: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  slotPlaceholder: {
    fontSize: 10,
    fontWeight: '600',
  },
  cursorIndicator: {
    width: 2,
    height: 18,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  counterText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
