 // HomeScreen.tsx (Fully Fixed + Typed + No Render Errors)

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
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  Button,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import PushNotification from 'react-native-push-notification';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { map } from 'rxjs/operators';
import { saveHistoryEvent } from '../services/historyStorage';

import { playSOSSound, playCrashSound, playDrivingSound } from '../services/soundService';
import { startMeshScan, stopMeshScan, broadcastMeshPayload } from '../services/bleMeshService';
import { requestLocationPermission } from '../utils/LocationPermissions';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';

/* ---------------- TYPES ---------------- */
type Coords = {
  lat: number;
  lng: number;
};

/* ---------------- CONSTANTS ---------------- */
const SPEED_THRESHOLD = 20;
const AUTO_OFF_DELAY = 10000;
const CRASH_G_THRESHOLD = 3;

export default function HomeScreen({ navigation }: any) {

  /* ---------------- STATE ---------------- */
  const [drivingMode, setDrivingMode] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  /* ---------------- REFS ---------------- */
  const sosScale = useRef(new Animated.Value(1)).current;
  const watchId = useRef<number | null>(null);
  const autoOffTimer = useRef<NodeJS.Timeout | null>(null);
  const crashSubscription = useRef<any>(null);
  const timeNow = new Date().toLocaleTimeString();
  /* ---------------- NOTIFICATIONS ---------------- */
  const handlePressIn = () => {
  Animated.spring(sosScale, {
    toValue: 0.9,
    useNativeDriver: true,
  }).start();
};

const handlePressOut = () => {
  Animated.spring(sosScale, {
    toValue: 1,
    useNativeDriver: true,
  }).start();
};

const startPulse = () => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(sosScale, {
        toValue: 1.05,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(sosScale, {
        toValue: 0.95,
        duration: 500,
        useNativeDriver: true,
      }),
    ])
  ).start();
};




  useFocusEffect(useCallback(() => {
    PushNotification.configure({
  onNotification: function (notification) {
    console.log('NOTIF:', notification);

    if (notification.action === 'Cancel') {
      console.log('❌ Cancel pressed from notification');

      global.cancelCrashCountdown?.();
    }
  },
  requestPermissions: Platform.OS === 'ios',
});

    if (Platform.OS === 'android') {
      PushNotification.createChannel({
        channelId: 'rescue-link-channel',
        channelName: 'Rescue Link Notifications',
        importance: 4,
      }, () => {});
    }
  }, []));

  const notify = (title: string, message: string, speedVal?: number) => {
    PushNotification.localNotification({
      channelId: 'rescue-link-channel',
      title,
      message: speedVal ? `${message} at ${speedVal} km/h` : message,
    });
  };

  /* ---------------- NETWORK ---------------- */
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected ?? false;
      setIsOnline(online);
      if (online) stopMeshScan();
    });
    return unsubscribe;
  }, []);

  /* ---------------- GPS SPEED ---------------- */
  useEffect(() => {
    const init = async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;

      watchId.current = Geolocation.watchPosition(
        (pos) => {
          const gpsSpeed = pos.coords.speed;
          const speedKmh = gpsSpeed ? gpsSpeed * 3.6 : 0;
          setSpeed(prev => Math.round((prev + speedKmh) / 2));
        },
        (err) => console.log(err.message),
        { enableHighAccuracy: true, interval: 2000 }
      );
    };

    init();

    return () => {
      if (watchId.current !== null) {
        Geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  /* ---------------- DRIVING MODE ---------------- */
  useEffect(() => {
    if (speed >= SPEED_THRESHOLD && !drivingMode) {
      setDrivingMode(true);
      playDrivingSound();
      notify('Driving Mode', 'Activated', speed);

      saveHistoryEvent({
    id: `${Date.now()}`,
    type: 'DRIVING_ON',
    timestamp: Date.now(),
    speed,
  });

      if (!isOnline) startMeshScan();
    }

    if (speed < SPEED_THRESHOLD && drivingMode && !autoOffTimer.current) {
      autoOffTimer.current = setTimeout(() => {
        setDrivingMode(false);
        notify('Driving Mode', 'Deactivated');

        saveHistoryEvent({
  id: `${Date.now()}`,
  type: 'DRIVING_OFF',
  timestamp: Date.now(),
  speed,
});
        autoOffTimer.current = null;
      }, AUTO_OFF_DELAY);
    }

    return () => {
      if (autoOffTimer.current) clearTimeout(autoOffTimer.current);
    };
  }, [speed, drivingMode, isOnline]);

  /* ---------------- CRASH DETECTION ---------------- */
  useEffect(() => {
    if (!drivingMode) return;

    setUpdateIntervalForType(SensorTypes.accelerometer, 100);

    crashSubscription.current = accelerometer.pipe(
      map(({ x, y, z }) => Math.sqrt(x * x + y * y + z * z) / 9.81)
    ).subscribe((gForce: number) => {

      if (gForce < CRASH_G_THRESHOLD) return;

      playCrashSound();

      /* 🔥 ADD THIS */
saveHistoryEvent({
  id: `${Date.now()}`,
  type: 'CRASH',
  timestamp: Date.now(),
  speed,
  description: `Impact force: ${gForce.toFixed(2)}G`,
});

      const payload = { type: 'CRASH', impactForce: gForce, timestamp: Date.now() };

      if (isOnline) {
        navigation.navigate('CrashDetection', { impactForce: gForce });
      } else {
        broadcastMeshPayload(payload);
        Alert.alert('Offline Mode', 'SOS sent via nearby devices');
      }
    });

    return () => crashSubscription.current?.unsubscribe();
  }, [drivingMode, isOnline]);

  /* ---------------- IMAGE PICKER ---------------- */
  const pickImage = async (type: 'camera' | 'gallery') => {
    let result: ImagePickerResponse;

    if (type === 'camera') {
      result = await launchCamera({ mediaType: 'photo' });
    } else {
      result = await launchImageLibrary({ mediaType: 'photo' });
    }

    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    const token = await AsyncStorage.getItem('token');

    const formData = new FormData();
    formData.append('image', {
      uri: selectedImage.uri,
      type: selectedImage.type || 'image/jpeg',
      name: selectedImage.fileName || 'photo.jpg',
    } as any);

    const res = await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts/upload-image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const data = await res.json();
    return res.ok ? data.url : null;
  };

  /* ---------------- SOS ---------------- */
  const handleSOS = async () => {
  if (!title || !description) {
    return Alert.alert('Error', 'Fill all fields');
  }

  setSending(true);

  try {
    const token = await AsyncStorage.getItem('token');

    const coords = await new Promise(resolve => {
      Geolocation.getCurrentPosition(
        pos => resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }),
        () => resolve(null)
      );
    });

    

    if (!coords) {
      return Alert.alert('Error', 'Location failed');
    }

    const imageUrl = selectedImage ? await uploadImage() : null;

    const payload = {
      alert_type: 'accident',
      severity: 'high',
      title,
      description,
      location: 'User current location', // ✅ REQUIRED
      latitude: coords.lat,
      longitude: coords.lng,
      image_url: imageUrl, // ✅ FIXED
    };

    const res = await fetch(
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

    const data = await res.json();

    console.log("STATUS:", res.status);
    console.log("RESPONSE:", data);

    if (!res.ok) {
      throw new Error('Failed request');
    }


    await saveHistoryEvent({
     id: `${Date.now()}`,
     type: 'SOS',
     timestamp: Date.now(),
     latitude: coords.lat,
     longitude: coords.lng,
     description: title,
});

    Alert.alert(
  'SOS Sent 🚨',
  `Your report has been sent successfully.\n\n📍 Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}\n⏰ Time: ${timeNow}`
);

    setModalVisible(false);
    setTitle('');
    setDescription('');
    setSelectedImage(null);

  } catch (err) {
    console.log(err);
    Alert.alert('Error', 'Failed to send SOS');
  } finally {
    setSending(false);
  }
};

  /* ---------------- UI ---------------- */
  return (
    <ScrollView style={styles.container}>

      <Text style={styles.header}>RescueLink</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Speed</Text>
        <Text style={styles.speed}>{speed} km/h</Text>
      </View>

      <View style={styles.card}>
        <Text style={[styles.network, { color: isOnline ? 'green' : 'orange' }]}>
          {isOnline ? 'Online Mode' : 'Offline Mesh Mode'}
        </Text>
      </View>

      <Pressable
  delayLongPress={3000}
  onPressIn={() => {
    handlePressIn();
    startPulse(); // optional
  }}
  onPressOut={handlePressOut}
  onLongPress={() => {
    playSOSSound();
    setModalVisible(true);
  }}
>
  <Animated.View style={[styles.sosButton, { transform: [{ scale: sosScale }] }]}>
    <Text style={styles.sosText}>SOS</Text>
    <Text style={styles.sosSub}>Hold 3 seconds</Text>
  </Animated.View>
</Pressable>

      <View style={styles.toggle}>
        <Text>Driving Mode</Text>
        <Switch value={drivingMode} onValueChange={setDrivingMode} />
      </View>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>

          <Text style={styles.modalTitle}>Manual SOS</Text>

          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Description" value={description} onChangeText={setDescription} multiline />

          <View style={styles.imageButtonsContainer}>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('gallery')}>
              <Text style={styles.imageButtonText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={() => pickImage('camera')}>
              <Text style={styles.imageButtonText}>Camera</Text>
            </TouchableOpacity>
          </View>

          {selectedImage && (
            <Image source={{ uri: selectedImage.uri }} style={styles.thumbnail} />
          )}

          {sending ? (
            <ActivityIndicator size="large" color="red" />
          ) : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleSOS}>
              <Text style={styles.submitText}>SUBMIT SOS</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
            <Text>Cancel</Text>
          </TouchableOpacity>

        </View>
      </Modal>

    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb'
  },

  header: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 3
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600'
  },

  speed: {
    fontSize: 48,
    fontWeight: '700',
    color: '#e74c3c',
    textAlign: 'center'
  },

  network: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },

  sosButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 100,
    paddingVertical: 24,
    alignItems: 'center',
    marginVertical: 20
  },

  sosText: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '700'
  },

  sosSub: {
    color: '#fff',
    fontSize: 14
  },

  toggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginTop: 20
  },

  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12
  },

  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },

  submitBtn: {
    backgroundColor: 'red',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10
  },

  submitText: {
    color: '#fff',
    fontWeight: 'bold'
  },

  cancelBtn: {
    marginTop: 10,
    alignItems: 'center'
  },

  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    alignSelf: 'center',
    marginVertical: 10
  },

  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10
  },

  imageButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 8
  },

  imageButtonText: {
    color: '#fff'
  }
}); 