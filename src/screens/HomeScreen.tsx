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

import { requestLocationPermission } from '../utils/LocationPermissions';

// Types for history events
export type HistoryEvent = {
  id: string;
  type: 'accident' | 'SOS' | 'DrivingMode' | 'Crash';
  description: string;
  timestamp: number;
  latitude?: number;
  longitude?: number;
};

// Storage key
const STORAGE_KEY = '@history';

// Fetch stored history
const getHistoryEvents = async (): Promise<HistoryEvent[]> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.log('Error fetching history:', error);
    return [];
  }
};

// Save a new event to history
const saveHistoryEvent = async (event: HistoryEvent) => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    const data: HistoryEvent[] = existing ? JSON.parse(existing) : [];
    data.unshift(event); // add new event to the top
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.log('Error saving history:', error);
  }
};

// Constants
const SPEED_THRESHOLD = 20; // km/h for auto-mode
const AUTO_OFF_DELAY = 10000; // ms delay to turn off driving mode

// Your Google Maps Geocoding API Key
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your key

// Function to fetch location name via Google Geocoding API
const fetchLocationName = async (lat: number, lng: number): Promise<string> => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
  } catch (error) {
    console.log('Geocoding error:', error);
  }
  return 'Unknown location';
};

export default function HomeScreen({ navigation }) {
  // State variables
  const [drivingMode, setDrivingMode] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [crashSensitivity, setCrashSensitivity] = useState('medium');
  const [history, setHistory] = useState<HistoryEvent[]>([]);

  // SOS modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [sending, setSending] = useState(false);
  const [title, setTitle] = useState('Emergency SOS');
  const [description, setDescription] = useState('Help needed at my location.');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');

  // Animations and timers
  const sosScale = useRef(new Animated.Value(1)).current;
  const autoOffTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchId = useRef<number | null>(null);

  // Load settings and history on focus
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

  // GPS speed monitoring
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

  // Auto toggle driving mode based on speed
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

  // Function to get current location
  const getLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Enable location permission.');
      return null;
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLatitude(latitude);
          setLongitude(longitude);
          setLocationText(`Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`);
          resolve({ lat: latitude, lng: longitude });
        },
        (err) => {
          Alert.alert('Location Error', err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });
  };

  // Handle manual SOS with dynamic title & description
  const handleManualSOS = async (titleInput, descriptionInput) => {
    setSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        setSending(false);
        return;
      }

      const coords = await getLocation();
      if (!coords) {
        setSending(false);
        return;
      }

      const name = await fetchLocationName(coords.lat, coords.lng);
      setLocationName(name);

      const response = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            alert_type: 'accident',
            severity: 'high',
            title: titleInput,
            description: descriptionInput,
            location: name,
            latitude: coords.lat,
            longitude: coords.lng,
            image_url: 'string',
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

      // Save event to history
      const newEvent: HistoryEvent = {
        id: Date.now().toString(),
        type: 'accident',
        timestamp: Date.now(),
        latitude: coords.lat,
        longitude: coords.lng,
        description: descriptionInput,
      };
      await saveHistoryEvent(newEvent);
      const updatedHistory = await getHistoryEvents();
      setHistory(updatedHistory);

      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Could not connect to server.');
    } finally {
      setSending(false);
    }
  };

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

      {/* Navigation to Crash Detection */}
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

          {/* Input fields for dynamic title & description */}
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

          {/* Location input */}
          <TextInput
            style={styles.input}
            placeholder="Location"
            value={locationText}
            onChangeText={setLocationText}
          />

          {/* Button to use current location */}
          <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
            <Text style={{ color: '#fff' }}>Use My Location</Text>
          </TouchableOpacity>

          {/* Show coordinates & location name */}
          {latitude !== null && longitude !== null && (
            <Text style={styles.coords}>
              Lat: {latitude.toFixed(6)} | Lng: {longitude.toFixed(6)} | {locationName}
            </Text>
          )}

          {/* Submit button / loader */}
          {sending ? (
            <ActivityIndicator size="large" color="red" />
          ) : (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => handleManualSOS(title, description)}
            >
              <Text style={styles.submitText}>SUBMIT SOS</Text>
            </TouchableOpacity>
          )}

          {/* Cancel button */}
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

// Styles
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
    marginBottom: 10,
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