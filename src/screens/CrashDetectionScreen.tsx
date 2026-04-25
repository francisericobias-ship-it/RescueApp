import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  Vibration,
  Platform,
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';

import {
  broadcastMeshPayload,
  startMeshScan,
  stopMeshScan,
} from '../services/bleMeshService';

import { saveHistoryEvent } from '../services/historyStorage';

type CrashSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
type UserSensitivity = 'low' | 'medium' | 'high';

const STORAGE_KEYS = {
  crashSensitivity: '@settings_crash_sensitivity',
};

export default function CrashDetectionScreen({ navigation, route }: any) {
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [impactForce] = useState(route?.params?.impactForce || 0);
  const [severity, setSeverity] = useState<CrashSeverity>('LOW');
  const [isSending, setIsSending] = useState(false);
  const [userSensitivity, setUserSensitivity] = useState<UserSensitivity>('medium');

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const triggerTimeRef = useRef<number | null>(null);
  const alreadySent = useRef(false);

  const seen = useRef<Set<string>>(new Set());
  const relayed = useRef<Set<string>>(new Set()); 

  
  const vibrationInterval = useRef<any>(null);
  const vibrationActive = useRef(false);

  /* ---------------- BLE SCAN (RELAY LISTENER) ---------------- */
  useEffect(() => {
    let isMounted = true;

    startMeshScan(async (payload) => {
  if (!payload?.id) return;

  try {
    // ❌ already processed → ignore
    if (seen.current.has(payload.id)) return;
    seen.current.add(payload.id);

    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    const token = await AsyncStorage.getItem('token');

    await fetch(
      'https://rescuelink-backend-j0gz.onrender.com/api/v1/crash',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: payload.latitude,
          longitude: payload.longitude,
          impact_force: payload.impact_force || 0,
          severity: payload.severity || 'UNKNOWN',
          device_id: 'relay-device',
          type: 'CRASH_RELAY',
          timestamp: new Date().toISOString(),
        }),
      }
    );

    console.log('✅ Relayed to server');

    // 🔥 RELAY ONLY ONCE (IMPORTANT FIX)
    if (!relayed.current.has(payload.id) && (payload.ttl ?? 0) > 0) {
      relayed.current.add(payload.id);

      const newPayload = {
        ...payload,
        ttl: (payload.ttl ?? 3) - 1,
        ack: true,
      };

      setTimeout(() => {
        broadcastMeshPayload(newPayload);
        console.log('🔁 RELAYED WITH TTL:', newPayload.ttl);
      }, Math.random() * 1000);
    }

  } catch (e) {
    console.log('❌ Relay failed:', e);
  }
});
    return () => {
      isMounted = false;
      stopMeshScan();
    };
  }, []);

  /* ---------------- KEEP AWAKE ---------------- */
  useEffect(() => {
    if (Platform.OS === 'android') activateKeepAwake();
    return () => deactivateKeepAwake();
  }, []);

  /* ---------------- VIBRATION ---------------- */
  useEffect(() => {
    vibrationActive.current = true;

    vibrationInterval.current = setInterval(() => {
      if (vibrationActive.current) Vibration.vibrate(1000);
    }, 2000);

    return () => {
      vibrationActive.current = false;
      clearInterval(vibrationInterval.current);
      Vibration.cancel();
    };
  }, []);

  /* ---------------- LOAD SETTINGS ---------------- */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.crashSensitivity).then((val) => {
      if (val) setUserSensitivity(val as UserSensitivity);
    });
  }, []);

  /* ---------------- SEVERITY ---------------- */
  const getSeverity = (g: number): CrashSeverity => {
    const t =
      userSensitivity === 'low'
        ? { c: 5, s: 4, m: 3 }
        : userSensitivity === 'medium'
        ? { c: 4, s: 3.5, m: 2.5 }
        : { c: 3.5, s: 3, m: 1.8 };

    if (g >= t.c) return 'CRITICAL';
    if (g >= t.s) return 'SEVERE';
    if (g >= t.m) return 'MODERATE';
    return 'LOW';
  };

  useEffect(() => {
    setSeverity(getSeverity(impactForce));
  }, [impactForce, userSensitivity]);

  /* ---------------- TIMER ---------------- */
  useEffect(() => {
    triggerTimeRef.current = Date.now() + 10000;

    const interval = setInterval(() => {
      if (!triggerTimeRef.current) return;

      const remaining = Math.max(
        0,
        Math.ceil((triggerTimeRef.current - Date.now()) / 1000)
      );

      setCountdown(remaining);

      Animated.sequence([
        Animated.timing(animatedCountdown, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedCountdown, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (!alreadySent.current && remaining <= 0) {
        alreadySent.current = true;
        handleCrashDetected();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /* ---------------- LOCATION ---------------- */
  const getLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true }
      );
    });

  /* ---------------- CRASH SEND ---------------- */
  const handleCrashDetected = async () => {
    vibrationActive.current = false;
    Vibration.cancel();
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const location = await getLocation();
      const net = await NetInfo.fetch();

      const lat = location?.latitude ?? 0;
      const lng = location?.longitude ?? 0;

      const payload = {
  id: `${Date.now()}`,
  latitude: lat,
  longitude: lng,
  ttl: 3,
};

      broadcastMeshPayload(payload);

      await saveHistoryEvent({
        id: payload.id,
        type: 'CRASH',
        description: 'Auto crash detected',
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
      });

      if (net.isConnected) {
        await fetch(
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
              impact_force: impactForce,
              severity,
              device_id: await DeviceInfo.getUniqueId(),
              type: 'CRASH',
              timestamp: new Date().toISOString(),
            }),
          }
        );

        Alert.alert('Emergency Sent', 'Crash alert delivered.');
      } else {
        Alert.alert('Offline Mode', 'Relaying via BLE mesh.');
      }

      // OPTIONAL: mark done for App.tsx auto return
      await AsyncStorage.setItem('CRASH_DONE', 'true');

    } catch (e) {
      Alert.alert('Error', 'Crash handling failed');
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------- CANCEL ---------------- */
  const handleCancel = async () => {
    vibrationActive.current = false;
    Vibration.cancel();
    setCancelled(true);

    await saveHistoryEvent({
      id: Date.now().toString(),
      type: 'CRASH_CANCELLED',
      description: 'User cancelled alert',
      timestamp: Date.now(),
    });

    navigation.navigate('MainTabs');
  };
  /* ---------------- UI ---------------- */
  if (cancelled) {
    return (
      <View style={styles.center}>
        <Icon name="x-circle" size={90} color="red" />
        <Text style={styles.title}>Alert Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Icon name="alert-triangle" size={100} color="red" />
      <Text style={styles.title}>CRASH DETECTED</Text>
      <Text style={styles.impact}>{impactForce.toFixed(2)}G IMPACT</Text>
      <Text style={styles.severity}>{severity}</Text>

      <Animated.View style={styles.circle}>
        <Text style={styles.count}>{countdown}</Text>
      </Animated.View>

      <Pressable style={styles.btn} onPress={handleCancel}>
        <Text style={styles.btnText}>CANCEL ALERT</Text>
      </Pressable>

      {isSending && <ActivityIndicator color="red" size="large" />}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 10,
  },
  impact: {
    color: '#aaa',
    fontSize: 18,
    marginTop: 8,
  },
  severity: {
    color: 'orange',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 5,
  },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'red',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  count: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  warning: {
    color: 'red',
    fontSize: 12,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: 'red',
    padding: 14,
    borderRadius: 30,
    paddingHorizontal: 30,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
});