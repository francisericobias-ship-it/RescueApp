// CrashDetectionScreen.tsx - FIXED VERSION

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
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const { width, height } = Dimensions.get('window');

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
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const triggerTimeRef = useRef<number | null>(null);
  const alreadySent = useRef(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null); // ✅ Add ref for interval
  const seen = useRef<Set<string>>(new Set());
  const relayedOnce = useRef<Set<string>>(new Set());
  const vibrationInterval = useRef<any>(null);
  const vibrationActive = useRef(false);

  /* ---------------- NETWORK MONITOR ---------------- */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  /* ---------------- BLE SCAN (RELAY LISTENER) ---------------- */
  useEffect(() => {
    let isMounted = true;

    startMeshScan(async (payload) => {
      if (!payload?.id) return;

      try {
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
              impact_force: 0,
              severity: 'UNKNOWN',
              device_id: 'relay-device',
              type: 'CRASH_RELAY',
              timestamp: new Date().toISOString(),
            }),
          }
        );

        console.log('✅ Relayed to server');

        if (!relayedOnce.current.has(payload.id) && (payload.ttl ?? 0) > 0) {
          relayedOnce.current.add(payload.id);
          const newPayload = {
            id: payload.id,
            latitude: payload.latitude,
            longitude: payload.longitude,
            ttl: (payload.ttl ?? 3) - 1,
          };
          setTimeout(() => {
            broadcastMeshPayload(newPayload);
            console.log("🔁 RELAYED SAFE:", newPayload.ttl);
          }, 300);
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
      if (vibrationInterval.current) clearInterval(vibrationInterval.current);
      Vibration.cancel();
    };
  }, []);

  /* ---------------- LOAD SETTINGS ---------------- */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.crashSensitivity).then((val) => {
      if (val) setUserSensitivity(val as UserSensitivity);
    });
  }, []);

  /* ---------------- SEVERITY CALCULATION ---------------- */
  const getSeverity = (g: number): CrashSeverity => {
    const thresholds = userSensitivity === 'low'
      ? { critical: 5, severe: 4, moderate: 3 }
      : userSensitivity === 'medium'
      ? { critical: 4, severe: 3.5, moderate: 2.5 }
      : { critical: 3.5, severe: 3, moderate: 1.8 };

    if (g >= thresholds.critical) return 'CRITICAL';
    if (g >= thresholds.severe) return 'SEVERE';
    if (g >= thresholds.moderate) return 'MODERATE';
    return 'LOW';
  };

  useEffect(() => {
    setSeverity(getSeverity(impactForce));
  }, [impactForce, userSensitivity]);

  /* ---------------- PULSE ANIMATION ---------------- */
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  /* ---------------- STOP COUNTDOWN ---------------- */
  const stopCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  /* ---------------- COUNTDOWN TIMER ---------------- */
  useEffect(() => {
    triggerTimeRef.current = Date.now() + 10000;

    // ✅ Store interval reference para ma-cancel later
    countdownIntervalRef.current = setInterval(() => {
      if (!triggerTimeRef.current) return;

      const remaining = Math.max(0, Math.ceil((triggerTimeRef.current - Date.now()) / 1000));
      setCountdown(remaining);

      Animated.sequence([
        Animated.timing(animatedCountdown, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedCountdown, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // ✅ Only trigger if not already sent
      if (!alreadySent.current && remaining <= 0) {
        alreadySent.current = true;
        stopCountdown(); // ✅ Stop the interval
        handleCrashDetected();
      }
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [animatedCountdown]);

  /* ---------------- LOCATION ---------------- */
  const getLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (error) => {
          console.log('Location error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  /* ---------------- CRASH HANDLER ---------------- */
  const handleCrashDetected = async () => {
    // ✅ Prevent double execution
    if (alreadySent.current) {
      console.log('⚠️ Already sent, ignoring duplicate call');
      return;
    }
    
    alreadySent.current = true;
    stopCountdown(); // ✅ Stop the countdown timer
    
    vibrationActive.current = false;
    Vibration.cancel();
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const location = await getLocation();
      const net = await NetInfo.fetch();

      // ✅ Use actual location, not default 0
      const lat = location?.latitude ?? 0;
      const lng = location?.longitude ?? 0;
      
      console.log('📍 Sending crash report with location:', { lat, lng });

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
        description: `Auto crash detected - ${severity} impact`,
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

        Alert.alert('Emergency Dispatched', 'Emergency services have been notified of your location.');
        await AsyncStorage.setItem('CRASH_DONE', 'true');
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Offline Mode', 'Emergency alert is being relayed via nearby devices.');
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 3000);
      }
    } catch (e) {
      console.log('Crash handling error:', e);
      Alert.alert('Error', 'Unable to send crash alert. Please try manually.');
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------- CANCEL HANDLER ---------------- */
  const handleCancel = async () => {
    // ✅ Stop countdown when cancelled
    stopCountdown();
    alreadySent.current = true; // ✅ Prevent auto-report after cancel
    
    vibrationActive.current = false;
    Vibration.cancel();
    setCancelled(true);

    await saveHistoryEvent({
      id: Date.now().toString(),
      type: 'CRASH_CANCELLED',
      description: 'User cancelled crash alert',
      timestamp: Date.now(),
    });

    setTimeout(() => {
      navigation.replace('MainTabs');
    }, 1500);
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'CRITICAL': return '#FF3B30';
      case 'SEVERE': return '#FF9F0A';
      case 'MODERATE': return '#FFCC00';
      default: return '#34C759';
    }
  };

  const getSeverityMessage = () => {
    switch (severity) {
      case 'CRITICAL': return 'Critical impact detected. Emergency services notified.';
      case 'SEVERE': return 'Severe impact detected. Preparing emergency response.';
      case 'MODERATE': return 'Moderate impact. Assessment in progress.';
      default: return 'Minor impact detected.';
    }
  };

  /* ---------------- UI RENDER ---------------- */
  if (cancelled) {
    return (
      <SafeAreaView style={styles.cancelledContainer} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#1C1C1E" />
        <Animated.View style={[styles.cancelledIcon, { transform: [{ scale: pulseAnim }] }]}>
          <Icon name="check-circle" size={80} color="#34C759" />
        </Animated.View>
        <Text style={styles.cancelledTitle}>Alert Cancelled</Text>
        <Text style={styles.cancelledSubtitle}>Returning to safety...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF9F0A' }]} />
            <Text style={styles.statusText}>
              {isOnline ? 'Emergency Services Connected' : 'Offline Mesh Mode'}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Animated.View style={[styles.warningIcon, { transform: [{ scale: pulseAnim }] }]}>
            <Icon name="alert-triangle" size={80} color="#FF3B30" />
          </Animated.View>

          <Text style={styles.title}>CRASH DETECTED</Text>
          
          <View style={styles.impactContainer}>
            <Text style={styles.impactLabel}>Impact Force</Text>
            <Text style={styles.impactValue}>{impactForce.toFixed(2)}<Text style={styles.impactUnit}>G</Text></Text>
          </View>

          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor() + '20' }]}>
            <Text style={[styles.severityText, { color: getSeverityColor() }]}>{severity}</Text>
          </View>

          <Text style={styles.severityMessage}>{getSeverityMessage()}</Text>

          {/* Countdown Circle */}
          <View style={styles.countdownContainer}>
            <Animated.View style={[styles.countdownCircle, { transform: [{ scale: animatedCountdown }] }]}>
              <Text style={styles.countdownText}>{countdown}</Text>
            </Animated.View>
            <Text style={styles.countdownLabel}>Auto-report in</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            >
              <Icon name="x" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>CANCEL</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.reportButton]}
              onPress={handleCrashDetected}
              disabled={isSending}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>REPORT NOW</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Warning Message */}
          <View style={styles.warningContainer}>
            <Icon name="info" size={14} color="#8E8E93" />
            <Text style={styles.warningText}>
              Emergency services will be notified automatically if you don't cancel
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  warningIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 1,
    marginBottom: 24,
    textAlign: 'center',
  },
  impactContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  impactLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  impactUnit: {
    fontSize: 24,
    fontWeight: '600',
    color: '#8E8E93',
  },
  severityBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  severityText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  severityMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 32,
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FF3B30',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
    marginRight: 8,
  },
  reportButton: {
    backgroundColor: '#FF3B30',
    marginLeft: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginLeft: 8,
  },
  cancelledContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledIcon: {
    marginBottom: 24,
  },
  cancelledTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#34C759',
    marginBottom: 8,
  },
  cancelledSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
});