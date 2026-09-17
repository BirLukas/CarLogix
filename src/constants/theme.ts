export const Colors = {
  light: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
  dark: {
    background: '#0B0F19',
    surface: '#151C2C',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accent: '#38BDF8',
    accentHover: '#0EA5E9',
    border: '#1E293B',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
  },
};

export type ColorTheme = typeof Colors.light;
