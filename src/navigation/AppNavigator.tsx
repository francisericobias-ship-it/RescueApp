import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import BottomTabNavigator from './BottomTabNavigator';
import CrashDetectionScreen from '../screens/CrashDetectionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// 🔥 IMPORT NAV REF
import { navigationRef } from '../services/NavigationService';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;

  // 🔥 FIX NAME (MATCH SA GINAGAMIT NATIN)
  CrashDetectionScreen: {
    impactForce?: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  initialRouteName: keyof RootStackParamList;
}

export default function AppNavigator({ initialRouteName }: AppNavigatorProps) {
  return (
    <SafeAreaProvider>
      {/* 🔥 ADD navigationRef */}
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >

          {/* Onboarding */}
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
          />

          {/* Auth */}
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />

          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
          />

          {/* Main App */}
          <Stack.Screen
            name="MainTabs"
            component={BottomTabNavigator}
          />

          {/* 🚨 CRASH SCREEN */}
          <Stack.Screen
            name="CrashDetectionScreen"
            component={CrashDetectionScreen}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}