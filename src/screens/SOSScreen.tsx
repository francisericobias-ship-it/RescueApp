import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '../utils/LocationPermissions';

export default function SOSScreen({ navigation }) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [locationDescription, setLocationDescription] = useState<string>('');

  // Function to get GPS coordinates
  const getLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    const granted = await requestLocationPermission();

    if (!granted) {
      Alert.alert('Permission required', 'Please enable location permission.');
      return null;
    }

    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLatitude(latitude);
          setLongitude(longitude);
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

  // Function to submit SOS
  const submitSOS = async () => {
    setSending(true);
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        setSending(false);
        return;
      }

      // Step 1: Get current location
      const coords = await getLocation();
      if (!coords) {
        setSending(false);
        return;
      }

      // Optional: Reverse geocode to get address
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            setLocationDescription(data.display_name);
          } else {
            setLocationDescription(`Lat: ${coords.lat}, Lng: ${coords.lng}`);
          }
        })
        .catch(() => {
          setLocationDescription(`Lat: ${coords.lat}, Lng: ${coords.lng}`);
        });

      // Prepare payload with new schema
      const alertData = {
        alert_type: 'accident', // or other type based on your context
        title: 'Emergency SOS',
        description: 'Help needed at current location.',
        location: locationDescription,
        latitude: coords.lat,
        longitude: coords.lng,
      };

      // Step 2: Send to API
      const response = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(alertData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Failed to send SOS');
        setSending(false);
        return;
      }

      Alert.alert('SOS Sent', 'Your emergency alert was successfully sent.');

      // Reset state
      setLatitude(null);
      setLongitude(null);
      setLocationDescription('');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Could not connect to server.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Emergency SOS</Text>

      {latitude !== null && longitude !== null && (
        <Text style={styles.coords}>
          Lat: {latitude.toFixed(6)} | Lng: {longitude.toFixed(6)}
        </Text>
      )}

      {sending ? (
        <ActivityIndicator size="large" color="red" />
      ) : (
        <TouchableOpacity style={styles.sosBtn} onPress={submitSOS}>
          <Text style={styles.sosText}>SEND SOS</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={{ color: '#333' }}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  coords: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
    color: '#555',
  },
  sosBtn: {
    backgroundColor: 'red',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  sosText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cancelBtn: {
    marginTop: 15,
    alignItems: 'center',
  },
});