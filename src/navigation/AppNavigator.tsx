import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
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
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  // Dynamic bottom inset to prevent overlapping with system navigation buttons (e.g. Samsung 3-button bar)
  const bottomInset = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 60 + (insets.bottom > 0 ? insets.bottom : 0);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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
      primary: theme.accent,
    },
  };

  // 1. Initial loading splash (cold boot only)
  if (isInitializing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.logoCircle, { backgroundColor: theme.accent }]}>
          <Ionicons name="speedometer" size={36} color="#FFFFFF" />
        </View>
        <Text style={[styles.appName, { color: theme.textPrimary }]}>CarLogix</Text>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 24 }} />
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
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
