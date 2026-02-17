import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Animated,
  Alert,
  ScrollView,
  Button,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  saveHistoryEvent,
  getHistoryEvents,
  HistoryEvent,
} from '../services/historyStorage';

import { requestLocationPermission } from '../utils/LocationPermissions';

const SPEED_THRESHOLD = 20; // km/h for auto-mode
const AUTO_OFF_DELAY = 10000; // ms

export default function HomeScreen({ navigation }) {
  // State management
  const [drivingMode, setDrivingMode] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [crashSensitivity, setCrashSensitivity] = useState('medium');
  const [history, setHistory] = useState<HistoryEvent[]>([]);

  // SOS modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const sosScale = useRef(new Animated.Value(1)).current;
  const autoOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchId = useRef<number | null>(null);

  // Load settings & history on focus
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const val = await AsyncStorage.getItem('@settings_crash_sensitivity');
        if (val === 'low' || val === 'medium' || val === 'high') {
          setCrashSensitivity(val);
        }
        const events = await getHistoryEvents();
        setHistory(events);
      };
      loadData();
    }, [])
  );

  // Watch GPS speed
  useEffect(() => {
    const startWatching = async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;

      watchId.current = Geolocation.watchPosition(
        (pos) => {
          const gpsSpeed = pos.coords.speed;
          if (gpsSpeed !== null && gpsSpeed >= 0) {
            const speedKmh = gpsSpeed * 3.6;
            setSpeed((prev) => Math.round((prev + speedKmh) / 2));
          } else {
            setSpeed(0);
          }
        },
        (error) => console.log('Geolocation error:', error.message),
        {
          enableHighAccuracy: true,
          distanceFilter: 1,
          interval: 2000,
          fastestInterval: 1000,
        }
      );
    };

    startWatching();

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  // Auto driving mode toggle
  useEffect(() => {
    if (speed >= SPEED_THRESHOLD && !drivingMode) {
      setDrivingMode(true);
    }

    if (speed < SPEED_THRESHOLD && drivingMode && !autoOffTimer.current) {
      autoOffTimer.current = setTimeout(() => {
        setDrivingMode(false);
        autoOffTimer.current = null;
      }, AUTO_OFF_DELAY);
    }

    return () => {
      if (autoOffTimer.current) {
        clearTimeout(autoOffTimer.current);
        autoOffTimer.current = null;
      }
    };
  }, [speed, drivingMode]);

  // Get current location
  const getLocation = async () => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Enable location permission.');
      return;
    }

    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        setLocationText(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
      },
      (err) => Alert.alert('Location Error', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // Submit manual SOS
  const submitSOS = async () => {
    if (!title || !description || latitude === null || longitude === null) {
      Alert.alert('Missing fields', 'Please complete all required fields.');
      return;
    }

    setSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in');
        setSending(false);
        return;
      }

      const response = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            alert_type: 'emergency',
            severity: 'high',
            title,
            description,
            location: locationText,
            latitude,
            longitude,
            image_url: '',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to send alert');
        setSending(false);
        return;
      }

      Alert.alert('SOS Sent', 'Emergency alert submitted successfully 🚑');

      // Save to history
      const newEvent: HistoryEvent = {
        id: Date.now().toString(),
        type: 'SOS',
        timestamp: Date.now(),
        latitude,
        longitude,
        description,
      };
      await saveHistoryEvent(newEvent);
      const updated = await getHistoryEvents();
      setHistory(updated);

      // Reset form
      setTitle('');
      setDescription('');
      setLocationText('');
      setLatitude(null);
      setLongitude(null);
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Could not connect to server.');
    } finally {
      setSending(false);
    }
  };

  // Render UI
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>RescueLink</Text>

      {/* Speed & Crash Sensitivity */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Speed</Text>
        <Text style={styles.speed}>{speed} km/h</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crash Sensitivity</Text>
        <Text style={styles.sensitivity}>{crashSensitivity.toUpperCase()}</Text>
      </View>

      {/* SOS Button */}
      <Animated.View style={{ transform: [{ scale: sosScale }] }}>
        <Pressable
          style={styles.sosButton}
          onLongPress={() => setModalVisible(true)}
          delayLongPress={3000}
          onPressIn={() =>
            Animated.spring(sosScale, { toValue: 0.95, useNativeDriver: true }).start()
          }
          onPressOut={() =>
            Animated.spring(sosScale, { toValue: 1, useNativeDriver: true }).start()
          }
        >
          <Text style={styles.sosText}>SOS</Text>
          <Text style={styles.sosSub}>Hold 3 seconds</Text>
        </Pressable>
      </Animated.View>

      {/* Crash Detection Navigation */}
      <Button
        title="Open Crash Detection"
        color="#e74c3c"
        onPress={() => navigation.navigate('CrashDetection', { crashSensitivity })}
      />

      {/* Driving Mode Toggle */}
      <View style={styles.toggle}>
        <Text>Driving Mode</Text>
        <Switch value={drivingMode} onValueChange={setDrivingMode} />
      </View>

      {/* Manual SOS Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Manual SOS Request</Text>
          
          {/* Input Fields */}
          <TextInput
            style={styles.input}
            placeholder="Title *"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Description *"
            multiline
            value={description}
            onChangeText={setDescription}
          />
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={locationText}
            onChangeText={setLocationText}
          />

          {/* Use My Location Button */}
          <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
            <Text style={{ color: '#fff' }}>Use My Location</Text>
          </TouchableOpacity>

          {/* Show Coordinates */}
          {latitude !== null && longitude !== null && (
            <Text style={styles.coords}>
              Lat: {latitude.toFixed(6)} | Lng: {longitude.toFixed(6)}
            </Text>
          )}

          {/* Submit Button / Loader */}
          {sending ? (
            <ActivityIndicator size="large" color="red" />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={submitSOS}>
              <Text style={styles.submitText}>SUBMIT SOS</Text>
            </TouchableOpacity>
          )}

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={{ color: '#333' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

// Styles (unchanged, but keep as is or customize further)
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f9fafb' },
  header: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  speed: {
    fontSize: 48,
    fontWeight: '700',
    color: '#e74c3c',
    textAlign: 'center',
  },
  sensitivity: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  sosButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 100,
    paddingVertical: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  sosText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700',
  },
  sosSub: {
    color: '#fff',
    fontSize: 14,
  },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },

  /* MODAL */
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  locationBtn: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  coords: {
    textAlign: 'center',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: 'red',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
});