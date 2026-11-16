import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AppNavigator } from './src/navigation';
import { AuthProvider } from './src/context/AuthContext';
import { VehicleProvider } from './src/context/VehicleContext';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <AuthProvider>
        <VehicleProvider>
          <AppNavigator />
        </VehicleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
