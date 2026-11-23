import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ColorTheme } from '../constants/theme';

export type ThemePreference = 'system' | 'dark' | 'light';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  theme: ColorTheme;
}

const THEME_STORAGE_KEY = '@carlogix_theme_preference';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'system' || saved === 'dark' || saved === 'light') {
          setThemePreferenceState(saved);
          try {
            if (typeof Appearance?.setColorScheme === 'function') {
              Appearance.setColorScheme(saved === 'system' ? 'unspecified' : saved);
            }
          } catch {
            // Ignore on platforms where Appearance.setColorScheme is not supported
          }
        }
      } catch (e) {
        console.warn('Error loading theme preference:', e);
      }
    };
    loadSavedTheme();
  }, []);

  const setThemePreference = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch (e) {
      console.warn('Error saving theme preference:', e);
    }
    try {
      if (typeof Appearance?.setColorScheme === 'function') {
        Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
      }
    } catch {
      // Ignore on platforms where Appearance.setColorScheme is not supported
    }
  };

  const resolvedScheme: 'light' | 'dark' =
    themePreference === 'system'
      ? systemColorScheme === 'light'
        ? 'light'
        : 'dark'
      : themePreference;

  const isDark = resolvedScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
        setThemePreference,
        colorScheme: resolvedScheme,
        isDark,
        theme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Drop-in replacement for React Native's useColorScheme that respects user's manual override
 */
export const useAppColorScheme = (): 'light' | 'dark' => {
  const context = useContext(ThemeContext);
  const systemColorScheme = useSystemColorScheme();
  if (context) {
    return context.colorScheme;
  }
  return systemColorScheme === 'light' ? 'light' : 'dark';
};
