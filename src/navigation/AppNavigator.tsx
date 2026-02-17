// AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import BottomTabNavigator from './BottomTabNavigator';
import CrashDetectionScreen from '../screens/CrashDetectionScreen';
import SignUpScreen from '../screens/SignUpScreen';

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  CrashDetection: { crashSensitivity?: 'low' | 'medium' | 'high' };
  SignUp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
  initialRouteName: keyof RootStackParamList;
}

export default function AppNavigator({ initialRouteName }: AppNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Routes as before */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Login' }}
        />

        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{ title: 'Sign Up' }}
        />

        <Stack.Screen
          name="MainTabs"
          component={BottomTabNavigator}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CrashDetection"
          component={CrashDetectionScreen}
          options={{ title: 'Crash Detection' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}