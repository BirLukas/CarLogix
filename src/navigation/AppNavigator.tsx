import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import {
  GarageScreen,
  RefuelingScreen,
  ServiceBookScreen,
  TelemetryScreen,
  SettingsScreen,
  TermsScreen,
  AuthScreen,
  EmailVerificationScreen,
} from '../screens';
import { MainTabParamList, RootStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  // Dynamic bottom inset to prevent overlapping with system navigation buttons (e.g. Samsung 3-button bar)
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 60 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF018F',
        tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#64748B',
        tabBarStyle: {
          backgroundColor: isDark ? '#160633' : theme.surface,
          borderTopColor: isDark ? 'rgba(255, 1, 143, 0.25)' : theme.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: isDark ? 10 : 4,
          shadowColor: isDark ? '#000000' : '#64748B',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Garage"
        component={GarageScreen}
        options={{
          tabBarLabel: 'Garáž',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'car-sport' : 'car-sport-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Refueling"
        component={RefuelingScreen}
        options={{
          tabBarLabel: 'Tankování',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'water' : 'water-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ServiceBook"
        component={ServiceBookScreen}
        options={{
          tabBarLabel: 'Servis',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'construct' : 'construct-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Telemetry"
        component={TelemetryScreen}
        options={{
          tabBarLabel: 'Telemetrie',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Nastavení',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { isInitializing, isAuthenticated, isEmailVerified } = useAuth();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      text: theme.textPrimary,
      border: theme.border,
      primary: '#FF018F',
    },
  };

  // 1. Initial loading splash (cold boot only) with CarLogix_Logo.png
  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <View style={styles.splashHalo}>
          <View style={styles.splashInner}>
            <Image
              source={require('../../assets/CarLogix_Logo.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={[styles.appName, { color: theme.textPrimary }]}>CarLogix</Text>
        <ActivityIndicator size="large" color="#FF018F" style={{ marginTop: 24 }} />
      </View>
    );
  }

  // 2. Unauthenticated: Auth flow (Login / Register)
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // 3. Authenticated but Email NOT verified: Strict Email Verification Barrier
  if (!isEmailVerified) {
    return <EmailVerificationScreen />;
  }

  // 4. Authenticated & Verified: Main Application
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.surface,
          },
          headerTintColor: theme.textPrimary,
          headerTitleStyle: {
            fontWeight: '700',
          },
          contentStyle: {
            backgroundColor: theme.background,
          },
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsScreen}
          options={{
            title: 'Podmínky a soukromí',
            headerBackTitle: 'Zpět',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashHalo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2A0C62',
    borderWidth: 2,
    borderColor: '#FF018F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF018F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
    padding: 3,
  },
  splashInner: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    backgroundColor: '#121118',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    padding: 6,
  },
  splashLogo: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

