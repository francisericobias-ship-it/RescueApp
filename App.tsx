// App.tsx - Complete with all permissions for Android 11 and 14

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
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

  /* ---------------- REQUEST ALL PERMISSIONS (Android 11 & 14 compatible) ---------------- */
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      const permissionsToRequest = [];

      // ========== LOCATION PERMISSIONS (Required for all Android versions) ==========
      permissionsToRequest.push(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );

      // ========== CAMERA PERMISSION ==========
      permissionsToRequest.push(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );

      // ========== NOTIFICATION PERMISSION (Android 13+) ==========
      if (Platform.Version >= 33) {
        permissionsToRequest.push(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      // ========== BLUETOOTH PERMISSIONS ==========
      if (Platform.Version >= 31) {
        // Android 12+ (API 31+) needs separate Bluetooth permissions
        permissionsToRequest.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        );
      } else {
        // Android 11 and below - traditional Bluetooth permissions
        permissionsToRequest.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
        );
      }

      // Request all permissions at once
      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      // Log results
      let allGranted = true;
      Object.entries(granted).forEach(([permission, result]) => {
        const isGranted = result === PermissionsAndroid.RESULTS.GRANTED;
        console.log(`${permission}: ${isGranted ? '✅' : '❌'}`);
        if (!isGranted) allGranted = false;
      });

      // Show alert for important missing permissions
      if (!allGranted) {
        Alert.alert(
          'Permissions Needed',
          'Some features may not work properly without permissions. You can enable them in Settings.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }

      console.log('✅ All permissions requested');
      return allGranted;
      
    } catch (err) {
      console.log('Permission error:', err);
      return false;
    }
  };

  /* ---------------- REQUEST PERMISSIONS SEQUENTIALLY (Better UX) ---------------- */
  const requestPermissionsSequentially = async () => {
    if (Platform.OS !== 'android') return true;

    try {
      // 1. Location permission (Most important)
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'RescueLink needs location to send your emergency location to responders.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );

      // 2. Bluetooth permissions based on Android version
      if (Platform.Version >= 31) {
        // Android 12+
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          {
            title: 'Bluetooth Scan',
            message: 'RescueLink needs Bluetooth to scan for nearby emergencies.',
            buttonPositive: 'Allow',
          }
        );
        
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          {
            title: 'Bluetooth Connect',
            message: 'RescueLink needs Bluetooth to connect to emergency mesh network.',
            buttonPositive: 'Allow',
          }
        );
        
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          {
            title: 'Bluetooth Advertising',
            message: 'RescueLink needs Bluetooth to make your device discoverable during emergencies.',
            buttonPositive: 'Allow',
          }
        );
      } else {
        // Android 11 and below
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          {
            title: 'Bluetooth Permission',
            message: 'RescueLink needs Bluetooth for emergency mesh network.',
            buttonPositive: 'Allow',
          }
        );
      }

      // 3. Camera permission
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'RescueLink needs camera to send photo evidence during emergencies.',
          buttonPositive: 'Allow',
        }
      );

      // 4. Notification permission (Android 13+)
      if (Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'RescueLink sends alerts for emergencies.',
            buttonPositive: 'Allow',
          }
        );
      }

      console.log('✅ All permissions requested sequentially');
      return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      
    } catch (err) {
      console.log('Permission error:', err);
      return false;
    }
  };

  /* ---------------- CHECK BLUETOOTH STATE ---------------- */
  const checkBluetoothAndPrompt = async () => {
    try {
      const state = await bleManager.state();
      console.log('Bluetooth state:', state);

      if (state !== 'PoweredOn') {
        Alert.alert(
          '🔵 Enable Bluetooth',
          'RescueLink needs Bluetooth for:\n\n• Emergency mesh network\n• Crash detection\n• Nearby device discovery\n\nPlease enable Bluetooth to use all features.',
          [
            { 
              text: 'Not Now', 
              style: 'cancel',
              onPress: () => console.log('User skipped Bluetooth')
            },
            { 
              text: 'Open Settings', 
              onPress: () => {
                Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
              }
            }
          ]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('Bluetooth check error:', error);
      return false;
    }
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
      // Request all permissions
      await requestPermissionsSequentially();
      
      // Check Bluetooth status and prompt
      const bluetoothReady = await checkBluetoothAndPrompt();
      
      if (!mounted) return;

      if (bluetoothReady) {
        startDeviceScan();
      }
      
      checkAppState();
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={initialRoute} />;
}