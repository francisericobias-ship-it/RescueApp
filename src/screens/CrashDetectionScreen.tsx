// CrashDetectionScreen.tsx - Clean version (no BLE)

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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { activateKeepAwake, deactivateKeepAwake } from '@sayem314/react-native-keep-awake';

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasSentRef = useRef(false);
  const vibrationInterval = useRef<any>(null);
  const vibrationActive = useRef(false);

  /* ---------------- NETWORK MONITOR ---------------- */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
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
      if (vibrationActive.current && !cancelled && !hasSentRef.current) {
        Vibration.vibrate(500);
      }
    }, 2000);

    return () => {
      vibrationActive.current = false;
      if (vibrationInterval.current) clearInterval(vibrationInterval.current);
      Vibration.cancel();
    };
  }, [cancelled]);

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
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  /* ---------------- COUNTDOWN ANIMATION ---------------- */
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedCountdown, { toValue: 0.8, duration: 500, useNativeDriver: true }),
        Animated.timing(animatedCountdown, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  /* ---------------- COUNTDOWN TIMER ---------------- */
  useEffect(() => {
    console.log('🟢 Setting up countdown timer');
    hasSentRef.current = false;
    
    let secondsLeft = 10;
    
    timerRef.current = setInterval(() => {
      secondsLeft--;
      console.log(`⏰ Countdown: ${secondsLeft} seconds remaining`);
      setCountdown(secondsLeft);
      
      if (secondsLeft <= 0 && !hasSentRef.current && !cancelled) {
        console.log('🚨 COUNTDOWN REACHED ZERO! Calling handleCrashDetected...');
        if (timerRef.current) clearInterval(timerRef.current);
        handleCrashDetected();
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cancelled]);

  /* ---------------- LOCATION ---------------- */
  const getLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (error) => { console.log('Location error:', error); resolve(null); },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });

  /* ---------------- GO BACK TO HOME ---------------- */
  const goBackToHome = () => {
    console.log('🏠 Navigating back to Home...');
    try {
      navigation.replace('MainTabs');
    } catch (e) {
      navigation.goBack();
    }
  };

  /* ---------------- CRASH HANDLER ---------------- */
  const handleCrashDetected = async () => {
    console.log('========== handleCrashDetected CALLED ==========');
    
    if (hasSentRef.current) {
      console.log('⚠️ Already sent, ignoring');
      return;
    }
    
    hasSentRef.current = true;
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    vibrationActive.current = false;
    Vibration.cancel();
    setIsSending(true);

    try {
      console.log('📍 Step 1: Getting token...');
      const token = await AsyncStorage.getItem('token');
      console.log('📍 Token exists:', !!token);
      
      console.log('📍 Step 2: Getting location...');
      const location = await getLocation();
      console.log('📍 Location obtained:', location);
      
      console.log('📍 Step 3: Checking network...');
      const net = await NetInfo.fetch();
      console.log('📍 Network connected:', net.isConnected);

      const lat = location?.latitude ?? 0;
      const lng = location?.longitude ?? 0;
      const deviceId = await DeviceInfo.getUniqueId();
      const packetId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('📍 Crash data:', { lat, lng, severity, packetId, impactForce });

      console.log('📍 Step 4: Saving to local history...');
      await saveHistoryEvent({
        id: packetId,
        type: 'CRASH',
        description: `Auto crash detected - ${severity} impact`,
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
      });
      console.log('✅ Local history saved');

      if (net.isConnected && token) {
        console.log('📍 Step 5: Preparing API request...');
        
        const crashData = {
          event_type: 'auto_crash',
          latitude: lat,
          longitude: lng,
          impact_force: impactForce,
          severity: severity.toLowerCase(),
          device_id: deviceId,
          source: 'mobile_app',
          packet_id: packetId,
          status: 'pending',
          movement_detected: true,
          sensitivity_level: userSensitivity.toLowerCase(),
          timestamp: new Date().toISOString(),
        };

        console.log('📍 Step 6: Sending to server:', JSON.stringify(crashData, null, 2));

        const response = await fetch(
          'https://rescuelink-backend-j0gz.onrender.com/api/v1/crash',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(crashData),
          }
        );

        console.log('📍 Step 7: Response status:', response.status);
        const result = await response.json();
        console.log('📍 Step 8: Server response:', result);

        if (response.ok) {
          Alert.alert('✅ Emergency Dispatched', 'Emergency services have been notified.');
        } else {
          console.log('❌ Server error:', result);
          Alert.alert('Error', result.message || 'Failed to send crash report');
        }
      } else {
        console.log('📍 Offline mode - saved locally only');
        if (!token) console.log('❌ No token found');
        if (!net.isConnected) console.log('❌ No internet connection');
        Alert.alert('Offline Mode', 'Crash saved locally. Will send when online.');
      }

      await AsyncStorage.setItem('CRASH_DONE', 'true');
      
      Alert.alert(
        'Report Sent',
        'Your crash report has been recorded.',
        [{ text: 'OK', onPress: () => goBackToHome() }]
      );
      
    } catch (error) {
      console.log('❌❌❌ ERROR DETAILS:', error);
      Alert.alert('Error', `Failed to process crash report: ${error}`);
    } finally {
      setIsSending(false);
    }
  };

  /* ---------------- CANCEL HANDLER ---------------- */
  const handleCancel = async () => {
    console.log('❌ User cancelled the alert');
    if (timerRef.current) clearInterval(timerRef.current);
    hasSentRef.current = true;
    vibrationActive.current = false;
    Vibration.cancel();
    setCancelled(true);

    await saveHistoryEvent({
      id: Date.now().toString(),
      type: 'CRASH_CANCELLED',
      description: 'User cancelled crash alert',
      timestamp: Date.now(),
    });

    setTimeout(() => goBackToHome(), 1500);
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
        <Icon name="check-circle" size={80} color="#34C759" />
        <Text style={styles.cancelledTitle}>Alert Cancelled</Text>
        <Text style={styles.cancelledSubtitle}>Returning to safety...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF9F0A' }]} />
              <Text style={styles.statusText}>
                {isOnline ? 'Emergency Services Connected' : 'Offline Mode'}
              </Text>
            </View>
          </View>

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

            <View style={styles.countdownContainer}>
              <Animated.View style={[styles.countdownCircle, { transform: [{ scale: animatedCountdown }] }]}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </Animated.View>
              <Text style={styles.countdownLabel}>Auto-report in</Text>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Icon name="x" size={24} color="#FFFFFF" />
                <Text style={styles.buttonText}>CANCEL</Text>
              </Pressable>

              <Pressable style={[styles.button, styles.reportButton]} onPress={handleCrashDetected} disabled={isSending}>
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

            <View style={styles.warningContainer}>
              <Icon name="info" size={14} color="#8E8E93" />
              <Text style={styles.warningText}>
                Emergency services will be notified automatically if you don't cancel
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    marginTop: 8,
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
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#3A3A3C',
  },
  reportButton: {
    backgroundColor: '#FF3B30',
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