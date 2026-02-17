import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '../utils/LocationPermissions';

export default function SOSScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [sending, setSending] = useState(false);
  const [modalVisible, setModalVisible] = useState(true); // Open agad para manual

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
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Could not connect to server.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Manual SOS</Text>
      
      {/* Form Inputs */}
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

      {/* Button to get current location */}
      <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
        <Text style={{ color: '#fff' }}>Use My Location</Text>
      </TouchableOpacity>

      {latitude && longitude && (
        <Text style={styles.coords}>
          Lat: {latitude.toFixed(6)} | Lng: {longitude.toFixed(6)}
        </Text>
      )}

      {sending ? (
        <ActivityIndicator size="large" color="red" />
      ) : (
        <TouchableOpacity style={styles.submitBtn} onPress={submitSOS}>
          <Text style={styles.submitText}>SUBMIT SOS</Text>
        </TouchableOpacity>
      )}

      {/* Close modal or navigate back */}
      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ color: '#333' }}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
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
  coords: { textAlign: 'center', marginBottom: 10 },
  submitBtn: {
    backgroundColor: 'red',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: {
    marginTop: 10,
    alignItems: 'center',
  },
});