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
} from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

import { broadcastMeshPayload } from '../services/bleMeshService';

type CrashSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export default function CrashDetectionScreen({ navigation, route }: any) {
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [impactForce, setImpactForce] = useState(route?.params?.impactForce || 0);
  const [severity, setSeverity] = useState<CrashSeverity>('LOW');
  const [isSending, setIsSending] = useState(false);

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const alreadySent = useRef(false);

  const determineSeverity = (g: number): CrashSeverity => {
    if (g >= 4) return 'CRITICAL';
    if (g >= 3.5) return 'SEVERE';
    if (g >= 2.5) return 'MODERATE';
    return 'LOW';
  };

  useEffect(() => {
    setSeverity(determineSeverity(impactForce));
  }, []);

  useEffect(() => {
    if (countdown <= 0 || cancelled) return;

    Animated.timing(animatedCountdown, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => animatedCountdown.setValue(1));

    countdownTimer.current = setTimeout(() => setCountdown(prev => prev - 1), 1000);

    if (!alreadySent.current && countdown <= 1 && !cancelled) {
  alreadySent.current = true;

  // STOP TIMER IMMEDIATELY
  if (countdownTimer.current) {
    clearTimeout(countdownTimer.current);
  }

  handleCrashDetected();
}

    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
  }, [countdown, cancelled]);

  const getCurrentLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

  const handleCrashDetected = async () => {
    setIsSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
  console.log("No token, BLE only mode");
}

      const location = await getCurrentLocation();
      if (!location) {
  console.log("No GPS, sending without location");
}

      const batteryLevel = await DeviceInfo.getBatteryLevel();
      const batteryPercent = Math.round(batteryLevel * 100);

      const netState = await NetInfo.fetch();

      const crashData = {
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        impact_force: Number(impactForce.toFixed(2)),
        severity: severity,
        device_battery: batteryPercent,
        network_type: netState.type ?? 'unknown',
        device_id: await DeviceInfo.getUniqueId(),
        source: netState.isConnected ? 'direct' : 'mesh',
        timestamp: new Date().toISOString(),
        packet_id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        type: 'CRASH',
      };

      // Always broadcast via BLE mesh for offline support
      const meshId = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

broadcastMeshPayload({
  id: meshId,
  type: 'CRASH',
  latitude: crashData.latitude,
  longitude: crashData.longitude,
  impact_force: crashData.impact_force,
  severity: crashData.severity,
  device_id: crashData.device_id,
  timestamp: Date.now(),
});

      if (!netState.isConnected) {
        Alert.alert('Offline Mode', 'Crash broadcasted via nearby devices.');
      } else {
        // If online, send to backend
        try {
          const response = await fetch(
            'https://rescuelink-backend-j0gz.onrender.com/api/v1/crash',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(crashData),
            }
          );

          let data = null;
          try {
            data = await response.json();
          } catch (_) {
            data = null; // prevent crash if JSON fails
          }

          if (response.ok) {
            Alert.alert(
              'Emergency Sent',
              'Crash alert sent to responders.',
              [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]
            );
          } else {
            Alert.alert('Error', data?.message || 'Failed to send crash alert.');
          }
        } catch (err) {
          console.log('Crash API error:', err);
          Alert.alert('Network Error', 'Unable to send crash alert, but broadcasted via mesh.');
        }
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Crash detection failed.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    setCancelled(true);
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
  };

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#E53E3E',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    marginVertical: 12,
    fontWeight: 'bold',
  },
  impact: {
    fontSize: 20,
    marginVertical: 8,
  },
  severity: {
    fontSize: 20,
    marginVertical: 8,
    fontWeight: 'bold',
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#edf2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  countdownText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
});