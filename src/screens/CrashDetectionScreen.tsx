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

type CrashSensitivity = 'low' | 'medium' | 'high';
type CrashSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

const CRASH_THRESHOLDS: Record<CrashSensitivity, number> = {
  low: 35,
  medium: 25,
  high: 18,
};

interface Props {
  navigation: any;
  route?: any;
}

const CrashDetectionScreen: React.FC<Props> = ({ navigation, route }) => {
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [sensitivity, setSensitivity] = useState<CrashSensitivity>('medium');
  const [impactForce, setImpactForce] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [crashDetected, setCrashDetected] = useState(false);
  const [severity, setSeverity] = useState<CrashSeverity>('LOW');

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const impactInterval = useRef<NodeJS.Timeout | null>(null);
  const alreadySent = useRef(false);

  // 🔹 Determine severity
  const determineSeverity = (gForce: number): CrashSeverity => {
    if (gForce >= 40) return 'CRITICAL';
    if (gForce >= 30) return 'SEVERE';
    if (gForce >= 20) return 'MODERATE';
    return 'LOW';
  };

  // 🔹 Load sensitivity safely
  useEffect(() => {
    const loadSensitivity = async () => {
      try {
        if (route?.params?.crashSensitivity) {
          setSensitivity(route.params.crashSensitivity);
          return;
        }

        const stored = await AsyncStorage.getItem('@settings_crash_sensitivity');

        if (stored === 'low' || stored === 'medium' || stored === 'high') {
          setSensitivity(stored);
        }
      } catch (e) {
        console.log('Sensitivity load error:', e);
      }
    };

    loadSensitivity();
  }, [route?.params?.crashSensitivity]);

  // 🔹 Simulated impact (temporary)
  useEffect(() => {
    impactInterval.current = setInterval(() => {
      const simulatedImpact = Math.random() * 45;
      setImpactForce(simulatedImpact);
    }, 1500);

    return () => {
      if (impactInterval.current) clearInterval(impactInterval.current);
    };
  }, []);

  // 🔹 Detect crash
  useEffect(() => {
    if (!crashDetected && impactForce >= CRASH_THRESHOLDS[sensitivity]) {
      const crashSeverity = determineSeverity(impactForce);
      setSeverity(crashSeverity);
      setCrashDetected(true);
      setCountdown(10);
    }
  }, [impactForce, sensitivity, crashDetected]);

  // 🔹 Countdown animation
  useEffect(() => {
    if (!crashDetected || countdown <= 0 || cancelled) return;

    Animated.timing(animatedCountdown, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => animatedCountdown.setValue(1));

    countdownTimer.current = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
  }, [countdown, crashDetected, cancelled]);

  // 🔹 Auto send once
  useEffect(() => {
    if (crashDetected && countdown <= 0 && !cancelled && !alreadySent.current) {
      alreadySent.current = true;
      handleCrashDetected();
    }
  }, [countdown, crashDetected, cancelled]);

  // 🔹 Send crash to backend
  const handleCrashDetected = async () => {
    setIsSending(true);

    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Auth Error', 'Please login again.');
        setIsSending(false);
        return;
      }

      const location = await getCurrentLocation();

      if (!location) {
        Alert.alert('Error', 'Location not available');
        setIsSending(false);
        return;
      }

      const batteryLevel = await DeviceInfo.getBatteryLevel();
      const batteryPercent = Math.round(batteryLevel * 100);

      const netState = await NetInfo.fetch();
      const networkType = netState.type ?? 'unknown';

      const crashData = {
        latitude: location.latitude,
        longitude: location.longitude,
        impact_force: Number(impactForce.toFixed(2)),
        device_battery: batteryPercent,
        network_type: networkType,
      };

      console.log('🚨 CRASH PAYLOAD:', crashData);

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

      const text = await response.text();
      console.log('📡 RAW RESPONSE:', text);

      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      if (response.ok) {
        Alert.alert('Success', data.message || 'Crash event recorded');
      } else {
        Alert.alert(
          'Error',
          data.message || `Server error (${response.status})`
        );
      }
    } catch (error) {
      console.log('❌ Crash send error:', error);
      Alert.alert('Error', 'Unable to send crash alert.');
    } finally {
      setIsSending(false);
    }
  };

  // 🔹 Get GPS location
  const getCurrentLocation = (): Promise<
    { latitude: number; longitude: number } | null
  > => {
    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        error => {
          console.log('Geolocation error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const handleCancel = () => {
    setCancelled(true);
    if (countdownTimer.current) clearTimeout(countdownTimer.current);
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return '#C53030';
      case 'SEVERE':
        return '#E53E3E';
      case 'MODERATE':
        return '#DD6B20';
      default:
        return '#38A169';
    }
  };

  // 🔴 Cancelled screen
  if (cancelled) {
    return (
      <View style={styles.cancelledContainer}>
        <Icon name="x-circle" size={96} color="#E53E3E" />
        <Text style={styles.cancelledTitle}>Alert Cancelled</Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name="alert-triangle" size={96} color={getSeverityColor()} />
      </View>

      <Text style={styles.title}>Crash Detected!</Text>

      <Text style={[styles.impact, { color: getSeverityColor() }]}>
        Impact Force: {impactForce.toFixed(2)} G
      </Text>

      <Text style={[styles.severityText, { color: getSeverityColor() }]}>
        Severity: {severity}
      </Text>

      <Animated.View
        style={[
          styles.countdownCircle,
          { transform: [{ scale: animatedCountdown }] },
        ]}
      >
        <Text style={styles.countdownText}>{countdown}</Text>
      </Animated.View>

      <Pressable
        style={styles.cancelButton}
        onPress={handleCancel}
        disabled={isSending}
      >
        <Text style={styles.cancelButtonText}>I'm OK – Cancel Alert</Text>
      </Pressable>

      {isSending && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
          <Text style={styles.sendingText}>Sending SOS...</Text>
        </View>
      )}
    </View>
  );
};

export default CrashDetectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconCircle: {
    backgroundColor: '#FED7D7',
    padding: 24,
    borderRadius: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  impact: {
    marginTop: 10,
    fontSize: 18,
  },
  severityText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  countdownCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EDF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  cancelButton: {
    backgroundColor: '#4299E1',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  sendingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#718096',
  },
  cancelledContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 20,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 30,
    backgroundColor: '#E53E3E',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});