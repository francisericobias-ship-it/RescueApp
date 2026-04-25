import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from './src/services/NavigationService';

import socket from './src/services/socketService';
import { saveHistoryEvent } from './src/services/historyStorage';

import { BleManager } from 'react-native-ble-plx';

type InitialRouteType = 'Onboarding' | 'Login' | 'MainTabs';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Login');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const crashHandledRef = useRef(false);
  const lastHandledId = useRef<string | null>(null);

  const bleManager = useRef(new BleManager()).current;

  (global as any).navigationRef = navigationRef;

  /* ---------------- BLUETOOTH PERMISSION ---------------- */
  const checkBluetoothPermissionsAndStatus = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Bluetooth permission is required.');
        return false;
      }
    }

    const state = await bleManager.state();

    if (state !== 'PoweredOn') {
      try {
        await bleManager.enable();
        return true;
      } catch {
        Alert.alert('Bluetooth Error', 'Enable Bluetooth manually.');
        return false;
      }
    }

    return true;
  };

  /* ---------------- BLE SCAN ---------------- */
  const startDeviceScan = () => {
    console.log('📡 BLE SCAN STARTED');

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        return;
      }

      if (device?.name?.startsWith('C|')) {
        console.log('🛰️ Found device:', device.name);
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      console.log('🛑 BLE SCAN STOPPED');
    }, 10000);
  };

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const ok = await checkBluetoothPermissionsAndStatus();

      if (!mounted) return;

      if (ok) {
        startDeviceScan();
        checkAppState();
      } else {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, []);

  /* ---------------- APP STATE ---------------- */
  const checkAppState = async () => {
    try {
      const onboarded = await AsyncStorage.getItem('onboarded');
      const token = await AsyncStorage.getItem('token');
      const userId = await AsyncStorage.getItem('user_id');

      if (userId) setCurrentUserId(parseInt(userId));

      if (!onboarded) setInitialRoute('Onboarding');
      else if (token) setInitialRoute('MainTabs');
      else setInitialRoute('Login');
    } catch {
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  /* ---------------- CRASH OVERLAY ---------------- */
  useEffect(() => {
    const checkCrashTrigger = async () => {
      const crashFlag = await AsyncStorage.getItem('OPEN_CRASH');

      if (crashFlag === 'true' && !crashHandledRef.current) {
        crashHandledRef.current = true;

        await AsyncStorage.removeItem('OPEN_CRASH');

        const go = () => {
          if (!navigationRef.isReady()) {
            setTimeout(go, 300);
            return;
          }

          navigationRef.reset({
            index: 0,
            routes: [
              {
                name: 'CrashDetectionScreen',
                params: { impactForce: 3.5 },
              },
            ],
          });
        };

        setTimeout(go, 500);
      }
    };

    checkCrashTrigger();
  }, []);

  /* ---------------- SOCKET ---------------- */
  useEffect(() => {
    socket.on('connect', () => console.log('✅ SOCKET CONNECTED'));
    socket.on('disconnect', () => console.log('❌ SOCKET DISCONNECTED'));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  /* ---------------- SOCKET EVENT ---------------- */
  useEffect(() => {
    if (!currentUserId) return;

    const handler = async (data: any) => {
      if (!data?.id) return;

      if (lastHandledId.current === data.id) return;
      lastHandledId.current = data.id;

      if (data.user_id === currentUserId) {
        await saveHistoryEvent({
          id: Date.now().toString(),
          type: 'ADMIN_ACCEPTED',
          description: 'Responder assigned 🚑',
          timestamp: Date.now(),
        });
      }
    };

    socket.on('alert:assigned', handler);

    return () => {
      socket.off('alert:assigned', handler);
    };
  }, [currentUserId]);

  /* ---------------- 🚨 CRASH AUTO RETURN TO HOME ---------------- */
  useEffect(() => {
    const interval = setInterval(async () => {
      const flag = await AsyncStorage.getItem('CRASH_DONE');

      if (flag === 'true') {
        await AsyncStorage.removeItem('CRASH_DONE');

        if (navigationRef.isReady()) {
          navigationRef.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });

          console.log('🏠 Returned to Home (MainTabs)');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- LOADING ---------------- */
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={initialRoute} />;
}