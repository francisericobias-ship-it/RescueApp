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
  Vibration,
  Platform,
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';

import { broadcastMeshPayload } from '../services/bleMeshService';
import { saveHistoryEvent } from '../services/historyStorage';

type CrashSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
type UserSensitivity = 'low' | 'medium' | 'high';

const STORAGE_KEYS = {
  crashSensitivity: '@settings_crash_sensitivity',
};

export default function CrashDetectionScreen({ navigation, route }: any) {

  /* ---------------- STATE ---------------- */
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [impactForce] = useState(route?.params?.impactForce || 0);
  const [severity, setSeverity] = useState<CrashSeverity>('LOW');
  const [isSending, setIsSending] = useState(false);
  const [userSensitivity, setUserSensitivity] = useState<UserSensitivity>('medium');

  /* ---------------- REFS ---------------- */
  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const alreadySent = useRef(false);
  const triggerTimeRef = useRef<number | null>(null);

  // 🔥 vibration control
  const vibrationActive = useRef(false);
  const vibrationInterval = useRef<any>(null);

  /* ---------------- KEEP SCREEN ON ---------------- */
  useEffect(() => {
    if (Platform.OS === 'android') activateKeepAwake();
    return () => deactivateKeepAwake();
  }, []);

  /* ---------------- FIXED VIBRATION ---------------- */
  useEffect(() => {
    vibrationActive.current = true;

    vibrationInterval.current = setInterval(() => {
      if (!vibrationActive.current) return;

      // vibrate 1 second
      Vibration.vibrate(1000);
    }, 2000);

    return () => {
      vibrationActive.current = false;
      if (vibrationInterval.current) clearInterval(vibrationInterval.current);
      Vibration.cancel();
    };
  }, []);

  /* ---------------- LOAD SETTINGS ---------------- */
  useEffect(() => {
    const loadSensitivity = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.crashSensitivity);
        if (saved === 'low' || saved === 'medium' || saved === 'high') {
          setUserSensitivity(saved);
        }
      } catch {}
    };
    loadSensitivity();
  }, []);

  /* ---------------- DETERMINE SEVERITY ---------------- */
  const determineSeverity = (g: number): CrashSeverity => {
    let thresholds;

    switch (userSensitivity) {
      case 'low':
        thresholds = { critical: 5, severe: 4, moderate: 3 };
        break;
      case 'medium':
        thresholds = { critical: 4, severe: 3.5, moderate: 2.5 };
        break;
      default:
        thresholds = { critical: 3.5, severe: 3, moderate: 1.8 };
    }

    if (g >= thresholds.critical) return 'CRITICAL';
    if (g >= thresholds.severe) return 'SEVERE';
    if (g >= thresholds.moderate) return 'MODERATE';
    return 'LOW';
  };

  useEffect(() => {
    setSeverity(determineSeverity(impactForce));
  }, [impactForce, userSensitivity]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    triggerTimeRef.current = Date.now() + 10000;
  }, []);

  useEffect(() => {
    if (cancelled) return;

    const tick = () => {
      if (!triggerTimeRef.current) return;

      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((triggerTimeRef.current - now) / 1000)
      );

      setCountdown(remaining);

      Animated.timing(animatedCountdown, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => animatedCountdown.setValue(1));

      if (!alreadySent.current && remaining <= 0) {
        alreadySent.current = true;
        handleCrashDetected();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [cancelled]);

  /* ---------------- APPSTATE FIX ---------------- */
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && triggerTimeRef.current && !alreadySent.current) {
        if (Date.now() >= triggerTimeRef.current) {
          alreadySent.current = true;
          handleCrashDetected();
        }
      }
    });

    return () => sub.remove();
  }, []);

  /* ---------------- LOCATION ---------------- */
  const getCurrentLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

  /* ---------------- SEND CRASH ---------------- */
  const handleCrashDetected = async () => {
    // 🔥 STOP vibration
    vibrationActive.current = false;
    if (vibrationInterval.current) clearInterval(vibrationInterval.current);
    Vibration.cancel();

    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const location = await getCurrentLocation();
      const netState = await NetInfo.fetch();

      const lat = location?.latitude ?? 0;
      const lng = location?.longitude ?? 0;

      broadcastMeshPayload({ latitude: lat, longitude: lng });

      await saveHistoryEvent({
        id: Date.now().toString(),
        type: 'CRASH',
        description: 'Auto crash detected and sent',
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
      });

      if (!netState.isConnected) {
        Alert.alert('Offline Mode', 'Sent via BLE mesh.');
        setIsSending(false);
        return;
      }

      const response = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/crash',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            latitude: lat,
            longitude: lng,
            impact_force: Number(impactForce.toFixed(2)),
            severity,
            device_id: await DeviceInfo.getUniqueId(),
            timestamp: new Date().toISOString(),
            type: 'CRASH',
          }),
        }
      );

      if (response.ok) {
        Alert.alert('Emergency Sent', 'Crash alert sent.', [
          { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
        ]);
      } else {
        Alert.alert('Error', 'Failed to send crash alert.');
      }

    } catch {
      Alert.alert('Error', 'Crash detection failed.');
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------- CANCEL ---------------- */
  const handleCancel = async () => {
    // 🔥 STOP vibration
    vibrationActive.current = false;
    if (vibrationInterval.current) clearInterval(vibrationInterval.current);
    Vibration.cancel();

    setCancelled(true);

    await saveHistoryEvent({
      id: Date.now().toString(),
      type: 'CRASH',
      description: '❌ Crash cancelled by user',
      timestamp: Date.now(),
    });

    Alert.alert('Cancelled', 'Crash alert cancelled.', [
      { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
    ]);
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'CRITICAL': return '#FF0000';
      case 'SEVERE': return '#FF3B30';
      case 'MODERATE': return '#FF9500';
      default: return '#34C759';
    }
  };

  /* ---------------- UI ---------------- */
  if (cancelled) {
    return (
      <View style={styles.center}>
        <Icon name="x-circle" size={96} color="#FF3B30" />
        <Text style={styles.title}>Alert Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon name="alert-triangle" size={110} color={getSeverityColor()} />

      <Text style={styles.title}>POSSIBLE CRASH DETECTED</Text>

      <Text style={styles.impact}>
        {impactForce.toFixed(2)} G Impact
      </Text>

      <Text style={[styles.severity, { color: getSeverityColor() }]}>
        {severity}
      </Text>

      <Animated.View style={styles.countdownCircle}>
        <Text style={styles.countdownText}>{countdown}</Text>
      </Animated.View>

      <Text style={styles.warning}>
        Emergency alert will be sent automatically
      </Text>

      <Pressable style={styles.button} onPress={handleCancel}>
        <Text style={styles.buttonText}>I'M OK - CANCEL</Text>
      </Pressable>

      {isSending && <ActivityIndicator size="large" color="#FF3B30" />}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    marginVertical: 12,
    textAlign: 'center',
  },
  impact: {
    fontSize: 20,
    color: '#DDD',
  },
  severity: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  countdownCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  countdownText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#FFF',
  },
  warning: {
    color: '#FF3B30',
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#FF3B30',
    borderRadius: 30,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
});