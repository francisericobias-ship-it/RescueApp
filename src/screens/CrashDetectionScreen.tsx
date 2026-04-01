// CrashDetectionScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  AppState,
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import PushNotification from 'react-native-push-notification';

import { broadcastMeshPayload } from '../services/bleMeshService';

type CrashSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
type UserSensitivity = 'low' | 'medium' | 'high';

const STORAGE_KEYS = {
  crashSensitivity: '@settings_crash_sensitivity',
};

export default function CrashDetectionScreen({ navigation, route }: any) {
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [impactForce, setImpactForce] = useState(route?.params?.impactForce || 0);
  const [severity, setSeverity] = useState<CrashSeverity>('LOW');
  const [isSending, setIsSending] = useState(false);
  const [userSensitivity, setUserSensitivity] = useState<UserSensitivity>('medium');

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const alreadySent = useRef(false);
  const triggerTimeRef = useRef<number | null>(null);

  // ✅ Create Notification Channel (Android)
  useEffect(() => {
    PushNotification.createChannel({
      channelId: 'crash-countdown-channel',
      channelName: 'Crash Countdown Notifications',
      importance: 4,
    });
  }, []);

  // Load user sensitivity
  useEffect(() => {
    const loadSensitivity = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.crashSensitivity);
        if (saved === 'low' || saved === 'medium' || saved === 'high') setUserSensitivity(saved);
      } catch (e) {
        console.warn('Failed to load sensitivity', e);
      }
    };
    loadSensitivity();
  }, []);

  // Determine severity
  const determineSeverity = (g: number): CrashSeverity => {
    let thresholds;
    switch(userSensitivity) {
      case 'low': thresholds = { critical: 5, severe: 4, moderate: 3 }; break;
      case 'medium': thresholds = { critical: 4, severe: 3.5, moderate: 2.5 }; break;
      case 'high': thresholds = { critical: 3.5, severe: 3, moderate: 1.8 }; break;
    }
    if (g >= thresholds.critical) return 'CRITICAL';
    if (g >= thresholds.severe) return 'SEVERE';
    if (g >= thresholds.moderate) return 'MODERATE';
    return 'LOW';
  };

  useEffect(() => { setSeverity(determineSeverity(impactForce)); }, [impactForce, userSensitivity]);

  // Set trigger time
  useEffect(() => { triggerTimeRef.current = Date.now() + 10000; }, []);

  // Countdown + Notification
  useEffect(() => {
    if (cancelled) return;
    const interval = setInterval(() => {
      if (!triggerTimeRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((triggerTimeRef.current - now) / 1000));
      setCountdown(remaining);

      // Animate circle
      Animated.timing(animatedCountdown, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => animatedCountdown.setValue(1));

      // Local notification
      PushNotification.localNotification({
        channelId: 'crash-countdown-channel',
        title: 'Crash Detected!',
        message: `Sending alert in ${remaining} seconds...`,
        ongoing: true,
        playSound: false,
        vibrate: false,
        ignoreInForeground: false,
      });

      if (!alreadySent.current && remaining === 0) {
        alreadySent.current = true;
        handleCrashDetected();
        PushNotification.cancelAllLocalNotifications();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cancelled]);

  // AppState check
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && triggerTimeRef.current && !alreadySent.current && Date.now() >= triggerTimeRef.current) {
        alreadySent.current = true;
        handleCrashDetected();
      }
    });
    return () => sub.remove();
  }, []);

  // Get location
  const getCurrentLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

  // Send crash data
  const handleCrashDetected = async () => {
    setIsSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const location = await getCurrentLocation();
      const netState = await NetInfo.fetch();

      const lat = location?.latitude ?? 0;
      const lng = location?.longitude ?? 0;

      broadcastMeshPayload({ latitude: lat, longitude: lng });
      console.log("📡 BLE SENT:", lat, lng);

      if (!netState.isConnected) {
        Alert.alert('Offline Mode', 'Location broadcasted via BLE mesh.');
        setIsSending(false);
        return;
      }

      const crashData = {
        latitude: lat,
        longitude: lng,
        impact_force: Number(impactForce.toFixed(2)),
        severity,
        device_id: await DeviceInfo.getUniqueId(),
        source: 'direct',
        timestamp: new Date().toISOString(),
        type: 'CRASH',
      };

      const response = await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(crashData),
      });

      if (response.ok) {
        Alert.alert('Emergency Sent', 'Crash alert sent to responders.', [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]);
      } else {
        Alert.alert('Error', 'Failed to send crash alert.');
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Crash detection failed.');
    } finally {
      setIsSending(false);
    }
  };

  // Cancel
  const handleCancel = () => {
    setCancelled(true);
    PushNotification.cancelAllLocalNotifications();
    Alert.alert('Alert Cancelled', 'Crash alert was cancelled.');
  };

  // UI
  const getSeverityColor = () => {
    switch (severity) {
      case 'CRITICAL': return '#C53030';
      case 'SEVERE': return '#E53E3E';
      case 'MODERATE': return '#DD6B20';
      default: return '#38A169';
    }
  };

  if (cancelled) {
    return (
      <View style={styles.center}>
        <Icon name="x-circle" size={96} color="#E53E3E" />
        <Text style={styles.title}>Alert Cancelled</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon name="alert-triangle" size={96} color={getSeverityColor()} />
      <Text style={styles.title}>Crash Impact Detected</Text>
      <Text style={styles.impact}>G-Force: {impactForce.toFixed(2)}G</Text>
      <Text style={[styles.severity, { color: getSeverityColor() }]}>{severity}</Text>

      <Animated.View style={[styles.countdownCircle, { transform: [{ scale: animatedCountdown }] }]}>
        <Text style={styles.countdownText}>{countdown}</Text>
      </Animated.View>

      <Pressable style={styles.button} onPress={handleCancel}>
        <Text style={styles.buttonText}>I'm OK – Cancel</Text>
      </Pressable>

      {isSending && <ActivityIndicator size="large" color="#E53E3E" />}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginVertical: 12,
    textAlign: 'center',
  },
  impact: {
    fontSize: 20,
    color: '#1E293B',
    marginVertical: 8,
    fontWeight: '500',
  },
  severity: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countdownText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#E53E3E',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  iconLarge: {
    marginBottom: 16,
  },
});