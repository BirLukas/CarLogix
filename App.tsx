import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { VehicleProvider } from './src/context/VehicleContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

const AppContent: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthProvider>
        <VehicleProvider>
          <AppNavigator />
        </VehicleProvider>
      </AuthProvider>
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
