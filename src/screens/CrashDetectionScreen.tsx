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
import Geolocation from '@react-native-community/geolocation'; // or 'react-native-geolocation-service'

type CrashSensitivity = 'low' | 'medium' | 'high';

const CRASH_THRESHOLDS: Record<CrashSensitivity, number> = {
  low: 6,
  medium: 8,
  high: 10,
};

interface Props {
  navigation: any;
  route: {
    params?: {
      crashSensitivity?: CrashSensitivity;
    };
  };
}

export default function CrashDetectionScreen({ navigation, route }: Props) {
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [sensitivity, setSensitivity] = useState<CrashSensitivity>('medium');
  const [impactForce, setImpactForce] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const impactInterval = useRef<NodeJS.Timeout | null>(null);

  // Load sensitivity from params or storage
  useEffect(() => {
    const loadSensitivity = async () => {
      if (route?.params?.crashSensitivity) {
        setSensitivity(route.params.crashSensitivity);
        return;
      }
      const stored = await AsyncStorage.getItem('@settings_crash_sensitivity');
      if (stored === 'low' || stored === 'medium' || stored === 'high') {
        setSensitivity(stored);
      }
    };
    loadSensitivity();
  }, [route?.params?.crashSensitivity]);

  // Simulate impact sensor updates
  useEffect(() => {
    impactInterval.current = setInterval(() => {
      const simulatedImpact = Math.random() * 12; // 0-12G
      setImpactForce(simulatedImpact);
    }, 1500);
    return () => {
      if (impactInterval.current) clearInterval(impactInterval.current);
    };
  }, []);

  // Countdown animation & effect
  useEffect(() => {
    if (countdown <= 0 || cancelled) return;

    // Animate countdown scale
    Animated.timing(animatedCountdown, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Set timer for next countdown
    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
      animatedCountdown.setValue(1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, cancelled, animatedCountdown]);

  // Detect crash based on impact force and countdown
  useEffect(() => {
    if (
      countdown === 0 &&
      !cancelled &&
      impactForce >= CRASH_THRESHOLDS[sensitivity]
    ) {
      handleCrashDetected();
    }
  }, [impactForce, countdown, cancelled, sensitivity]);

  // Fetch location and send crash report
  const handleCrashDetected = async () => {
    setIsSending(true);
    try {
      const location = await getCurrentLocation();

      // Prepare crash data
      const crashData = {
        type: 'CRASH',
        description: `Crash detected (${impactForce.toFixed(2)}G | ${sensitivity})`,
        impact_force: impactForce,
        sensitivity,
        latitude: location?.latitude,
        longitude: location?.longitude,
      };

      // Send to backend API
      const response = await fetch('https://your-api-endpoint.com/crash-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crashData),
      });

      if (response.ok) {
        Alert.alert('🚨 Emergency Alert', 'Crash detected. SOS sent!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error('Failed to send crash alert');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Unable to send crash alert or get location.');
    } finally {
      setIsSending(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise<{ latitude: number; longitude: number } | null>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({ latitude, longitude });
        },
        (error) => {
          console.log('Geolocation error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  const handleCancel = () => {
    setCancelled(true);
  };

  if (cancelled) {
    return (
      <View style={styles.cancelledContainer}>
        <Icon name="x-circle" size={96} color="#E53E3E" />
        <Text style={styles.cancelledTitle}>Alert Cancelled</Text>
        <Text style={styles.cancelledDesc}>The emergency alert has been cancelled.</Text>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Impact Icon */}
      <View style={styles.iconCircle}>
        <Icon name="alert-triangle" size={96} color="#E53E3E" />
      </View>

      {/* Crash Info */}
      <Text style={styles.title}>Crash Detected!</Text>
      <Text style={styles.sensitivityText}>Sensitivity: {sensitivity.toUpperCase()}</Text>
      <Text style={styles.impact}>Impact Force: {impactForce.toFixed(2)} G</Text>

      {/* Countdown Circle with animated scale */}
      <Animated.View
        style={[
          styles.countdownCircle,
          { transform: [{ scale: animatedCountdown }] },
        ]}
      >
        <Text style={styles.countdownText}>{countdown}</Text>
      </Animated.View>

      {/* Cancel Button */}
      <Pressable style={styles.cancelButton} onPress={handleCancel} disabled={isSending}>
        <Text style={styles.cancelButtonText}>I'm OK – Cancel Alert</Text>
      </Pressable>

      {/* Show activity indicator when sending */}
      {isSending && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E53E3E" />
          <Text style={styles.sendingText}>Sending SOS...</Text>
        </View>
      )}
    </View>
  );
}

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
    marginBottom: 8,
  },
  sensitivityText: {
    fontSize: 16,
    color: '#718096',
  },
  impact: {
    fontSize: 18,
    color: '#E53E3E',
    marginBottom: 20,
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
    marginTop: 20,
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
    padding: 20,
  },
  cancelledTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 20,
  },
  cancelledDesc: {
    textAlign: 'center',
    marginTop: 10,
    color: '#718096',
    fontSize: 16,
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