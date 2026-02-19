import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'MainTabs'>('Login');

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Optional: verify token validity here
          setInitialRoute('MainTabs');
        } else {
          setInitialRoute('Login');
        }
      } catch (e) {
        console.log('Error reading token:', e);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkToken();
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