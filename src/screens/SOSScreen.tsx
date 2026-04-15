import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
} from 'react-native';

import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

import { saveHistoryEvent } from '../services/historyStorage';

export default function SOSScreen({ navigation }: any) {

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<any>(null);
  const [sending, setSending] = useState(false);

  const pickImage = async (type: 'camera' | 'gallery') => {
    const res =
      type === 'camera'
        ? await launchCamera({ mediaType: 'photo' })
        : await launchImageLibrary({ mediaType: 'photo' });

    if (!res.didCancel && res.assets?.length) {
      setImage(res.assets[0]);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    const token = await AsyncStorage.getItem('token');

    const formData = new FormData();
    formData.append('image', {
      uri: image.uri,
      type: image.type || 'image/jpeg',
      name: image.fileName || 'photo.jpg',
    } as any);

    const res = await fetch(
      'https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts/upload-image',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );

    const data = await res.json();
    return res.ok ? data.url : null;
  };

  const handleSOS = async () => {
    if (!title || !description) {
      return Alert.alert('Error', 'Fill all fields');
    }

    setSending(true);

    try {
      const net = await NetInfo.fetch();
      const token = await AsyncStorage.getItem('token');

      const coords = await new Promise<any>(resolve => {
        Geolocation.getCurrentPosition(
          pos =>
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          () => resolve(null)
        );
      });

      if (!coords) {
        return Alert.alert('Error', 'Location failed');
      }

      const imageUrl = await uploadImage();

      const payload = {
        title,
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        image_url: imageUrl,
      };

      if (net.isConnected) {
        await fetch(
          'https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );

        Alert.alert('SOS Sent 🚨', 'Online SOS sent');
      } else {
        await saveHistoryEvent({
          id: `${Date.now()}`,
          type: 'SOS_OFFLINE',
          timestamp: Date.now(),
          latitude: coords.lat,
          longitude: coords.lng,
          description: title,
        });

        Alert.alert('Saved 📡', 'Offline SOS stored');
      }

      navigation.goBack();

    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to send SOS');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manual SOS</Text>

      <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} />

      <TouchableOpacity onPress={() => pickImage('gallery')}>
        <Text>Pick Image</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image.uri }} style={{ width: 100, height: 100 }} />}

      {sending ? (
        <ActivityIndicator />
      ) : (
        <TouchableOpacity onPress={handleSOS}>
          <Text>Send SOS</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#111827',
  },

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },

  imageBtn: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
  },

  imageBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    alignSelf: 'center',
    marginVertical: 10,
  },

  sendBtn: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 15,
  },

  sendText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  loading: {
    marginTop: 20,
  },

  backText: {
    textAlign: 'center',
    marginTop: 15,
    color: '#6b7280',
  },
});