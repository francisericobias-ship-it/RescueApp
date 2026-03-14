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
import {
  accelerometer,
  setUpdateIntervalForType,
  SensorTypes,
} from 'react-native-sensors';
import { map, filter } from 'rxjs/operators';

type CrashSensitivity = 'low' | 'medium' | 'high';
type CrashSeverity = 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

const CRASH_THRESHOLDS: Record<CrashSensitivity, number> = {
  low: 3.5,
  medium: 2.8,
  high: 2.2,
};

const STILLNESS_THRESHOLD = 0.3;
const STILLNESS_TIME = 5000;

export default function CrashDetectionScreen({ navigation, route }: any) {
  const [countdown, setCountdown] = useState(10);
  const [cancelled, setCancelled] = useState(false);
  const [impactForce, setImpactForce] = useState(0);
  const [severity, setSeverity] = useState<CrashSeverity>('LOW');
  const [crashDetected, setCrashDetected] = useState(false);
  const [countdownStarted, setCountdownStarted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const sensitivity: CrashSensitivity =
    route?.params?.crashSensitivity || 'medium';

  const animatedCountdown = useRef(new Animated.Value(1)).current;
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);
  const stillnessTimer = useRef<NodeJS.Timeout | null>(null);
  const lastMovement = useRef(Date.now());
  const alreadySent = useRef(false);
  const sensorSubscription = useRef<any>(null);

  const calculateGForce = (x: number, y: number, z: number) =>
    Math.sqrt(x * x + y * y + z * z) / 9.81;

  const determineSeverity = (g: number): CrashSeverity => {
    if (g >= 4) return 'CRITICAL';
    if (g >= 3.5) return 'SEVERE';
    if (g >= 2.5) return 'MODERATE';
    return 'LOW';
  };

  // 📡 SENSOR
  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);

    sensorSubscription.current = accelerometer
      .pipe(
        map(({ x, y, z }) => calculateGForce(x, y, z)),
        filter(g => g > 0)
      )
      .subscribe(gForce => {
        setImpactForce(gForce);

        // movement tracking
        if (gForce > STILLNESS_THRESHOLD) {
          lastMovement.current = Date.now();
        }

        // crash trigger
        if (!crashDetected && gForce >= CRASH_THRESHOLDS[sensitivity]) {
          const crashSeverity = determineSeverity(gForce);
          setSeverity(crashSeverity);
          setCrashDetected(true);

          // Immediately start countdown if impact is MODERATE or higher
          if (crashSeverity !== 'LOW') {
            setCountdownStarted(true);
            setCountdown(10);
          }

          // Stillness check can be optional, comment out if not needed
          // stillnessTimer.current = setTimeout(() => {
          //   const now = Date.now();
          //   if (now - lastMovement.current >= STILLNESS_TIME) {
          //     // impact detected and countdown started
          //   } else {
          //     // false alarm
          //     setCrashDetected(false);
          //   }
          // }, STILLNESS_TIME);
        }
      });

    return () => {
      sensorSubscription.current?.unsubscribe();
      if (stillnessTimer.current) clearTimeout(stillnessTimer.current);
    };
  }, [crashDetected, sensitivity]);

  // ⏱ COUNTDOWN
  useEffect(() => {
    if (!countdownStarted || countdown <= 0 || cancelled) return;

    Animated.timing(animatedCountdown, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => animatedCountdown.setValue(1));

    countdownTimer.current = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    // kapag umabot na sa zero at hindi naka-cancel, magse-send
    if (countdown - 1 === 0) {
      if (!cancelled && !alreadySent.current) {
        alreadySent.current = true;
        handleCrashDetected();
      }
    }

    return () => {
      if (countdownTimer.current) clearTimeout(countdownTimer.current);
    };
  }, [countdown, countdownStarted, cancelled]);

  const handleCrashDetected = async () => {
  setIsSending(true);
  try {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Auth Error', 'Please login again.');
      return;
    }

    const location = await getCurrentLocation();
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    const batteryLevel = await DeviceInfo.getBatteryLevel();
    const batteryPercent = Math.round(batteryLevel * 100);
    const netState = await NetInfo.fetch();

    const crashData = {
      latitude: location.latitude,
      longitude: location.longitude,
      impact_force: Number(impactForce.toFixed(2)),
      device_battery: batteryPercent,
      network_type: netState.type ?? 'unknown',
    };

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

    const data = await response.json();

    if (response.ok) {
  Alert.alert('Success', 'Crash report sent successfully', [
    { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
  ]);
} else {
      Alert.alert('Error', data.message || 'Failed to send crash');
    }
  } catch (e) {
    Alert.alert('Error', 'Unable to send crash alert.');
  } finally {
    setIsSending(false);
  }
};

  const getCurrentLocation = () =>
    new Promise<{ latitude: number; longitude: number } | null>(resolve => {
      Geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });

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

  // Render always returns a valid component
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
      <Text style={styles.title}>Hit Impact</Text>

      <Text style={styles.impact}>G-Force: {impactForce.toFixed(2)}G</Text>

      <Text style={[styles.severity, { color: getSeverityColor() }]}>
        {severity}
      </Text>

      {countdownStarted && (
        <>
          <Animated.View
            style={[
              styles.countdownCircle,
              { transform: [{ scale: animatedCountdown }] },
            ]}
          >
            <Text style={styles.countdownText}>{countdown}</Text>
          </Animated.View>

          <Pressable style={styles.button} onPress={handleCancel}>
            <Text style={styles.buttonText}>I'm OK – Cancel</Text>
          </Pressable>
        </>
      )}

      {isSending && <ActivityIndicator size="large" color="#E53E3E" />}
    </View>
  );
}

// Add missing styles
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#edf2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  countdownText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
});