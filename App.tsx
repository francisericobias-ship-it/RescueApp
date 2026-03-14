import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

type InitialRouteType = 'Onboarding' | 'Login' | 'MainTabs';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Login');

  useEffect(() => {
    const checkAppState = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('onboarded');
        const token = await AsyncStorage.getItem('token');

        // 🔥 FIRST TIME USER
        if (!onboarded) {
          setInitialRoute('Onboarding');
        } 
        // ✅ Already onboarded
        else {
          if (token) {
            setInitialRoute('MainTabs');
          } else {
            setInitialRoute('Login');
          }
        }
      } catch (e) {
        console.log('Error reading storage:', e);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAppState();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={initialRoute} />;
}