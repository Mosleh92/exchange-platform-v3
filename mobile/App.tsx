/**
 * Exchange Platform Mobile App - Main Entry Point
 * Phase 3: Native Mobile Applications with Biometric Authentication
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuthStore } from './src/store/authStore';
import { initializeApp } from './src/services/appInitializer';
import { theme } from './src/theme';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import BiometricSetupScreen from './src/screens/auth/BiometricSetupScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import TradingScreen from './src/screens/trading/TradingScreen';
import PortfolioScreen from './src/screens/portfolio/PortfolioScreen';
import MarketScreen from './src/screens/market/MarketScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Trading') {
            iconName = 'trending-up';
          } else if (route.name === 'Portfolio') {
            iconName = 'account-balance-wallet';
          } else if (route.name === 'Market') {
            iconName = 'bar-chart';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.disabled,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Trading" 
        component={TradingScreen}
        options={{ title: 'Trading' }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen}
        options={{ title: 'Portfolio' }}
      />
      <Tab.Screen 
        name="Market" 
        component={MarketScreen}
        options={{ title: 'Market' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator
function AuthStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
      }}
    >
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen 
        name="BiometricSetup" 
        component={BiometricSetupScreen}
        options={{ title: 'Security Setup' }}
      />
    </Stack.Navigator>
  );
}

// Main Stack Navigator
function AppStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    const initApp = async () => {
      try {
        await initializeApp();
        await initializeAuth();
      } catch (error) {
        console.error('App initialization failed:', error);
      }
    };

    initApp();
  }, [initializeAuth]);

  if (isLoading) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          {/* Loading screen component would go here */}
          <div>Loading...</div>
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <NavigationContainer>
            {isAuthenticated ? <AppStackNavigator /> : <AuthStackNavigator />}
          </NavigationContainer>
          <FlashMessage position="top" />
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}