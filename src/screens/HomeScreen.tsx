// HomeScreen.tsx - Simplified with Real GPS Speed Only

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
  StatusBar,
  Dimensions,
} from 'react-native';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import PushNotification from 'react-native-push-notification';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { map } from 'rxjs/operators';
import { saveHistoryEvent } from '../services/historyStorage';
import Icon from 'react-native-vector-icons/Feather';

import { playSOSSound, playCrashSound, playDrivingSound } from '../services/soundService';
import { startMeshScan, stopMeshScan, broadcastMeshPayload } from '../services/bleMeshService';
import { requestLocationPermission } from '../utils/LocationPermissions';
import { launchCamera, launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import { startAdvertising, stopAdvertising } from '../native/BLEAdvertiser';

const { width } = Dimensions.get('window');

/* ---------------- TYPES ---------------- */
type Coords = {
  lat: number;
  lng: number;
};

/* ---------------- CONSTANTS ---------------- */
const SPEED_THRESHOLD = 20;
const AUTO_OFF_DELAY = 10000;
const CRASH_G_THRESHOLD = 3;

export default function HomeScreen({ navigation: propNavigation }: any) {
  const navigation = useNavigation();
  const nav = propNavigation || navigation;

  /* ---------------- STATE ---------------- */
  const [drivingMode, setDrivingMode] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [locationCoords, setLocationCoords] = useState<Coords | null>(null);
  const [bleReady, setBleReady] = useState<boolean>(false);
  const [isAdvertising, setIsAdvertising] = useState<boolean>(false);

  /* ---------------- REFS ---------------- */
  const sosScale = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const watchId = useRef<number | null>(null);
  const autoOffTimer = useRef<NodeJS.Timeout | null>(null);
  const crashSubscription = useRef<any>(null);

  /* ---------------- ANIMATIONS ---------------- */
  const handlePressIn = () => {
    Animated.spring(sosScale, {
      toValue: 0.95,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(sosScale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const startPulse = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sosScale, {
          toValue: 1.03,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(sosScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulse = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
      Animated.spring(sosScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  /* ---------------- BLE ADVERTISING FUNCTIONS ---------------- */
  const startBLEAdvertising = async () => {
    try {
      const message = JSON.stringify({
        type: 'RESCUELINK',
        device: 'RescueLink Device',
        timestamp: Date.now(),
        lat: locationCoords?.lat || 0,
        lng: locationCoords?.lng || 0,
      });
      const result = await startAdvertising(message);
      if (result) {
        setIsAdvertising(true);
        Alert.alert('BLE Advertising', 'Your device is now discoverable!');
      } else {
        Alert.alert('Error', 'Failed to start advertising');
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to start advertising');
    }
  };

  const stopBLEAdvertising = async () => {
    await stopAdvertising();
    setIsAdvertising(false);
    Alert.alert('BLE Advertising', 'Device is no longer discoverable');
  };

  /* ---------------- NOTIFICATIONS ---------------- */
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

  /* ---------------- BLE SETUP ---------------- */
  useEffect(() => {
    const setupBLE = async () => {
      try {
        setBleReady(true);
        console.log('✅ BLE Mesh network ready');
      } catch (error) {
        console.log('BLE setup error:', error);
      }
    };
    setupBLE();
  }, []);

  /* ---------------- GPS & LOCATION ---------------- */
  useEffect(() => {
    const init = async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;

      Geolocation.getCurrentPosition(
        (pos) => {
          setLocationCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.log(err.message)
      );

      watchId.current = Geolocation.watchPosition(
        (pos) => {
          const gpsSpeed = pos.coords.speed;
          const speedKmh = gpsSpeed ? gpsSpeed * 3.6 : 0;
          setSpeed(prev => Math.round((prev + speedKmh) / 2));
          setLocationCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => console.log(err.message),
        { enableHighAccuracy: true, interval: 2000, distanceFilter: 5 }
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

    if (speed >= SPEED_THRESHOLD && autoOffTimer.current) {
      clearTimeout(autoOffTimer.current);
      autoOffTimer.current = null;
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

      saveHistoryEvent({
        id: `${Date.now()}`,
        type: 'CRASH',
        timestamp: Date.now(),
        speed,
        description: `Impact force: ${gForce.toFixed(2)}G`,
      });

      const payload = { type: 'CRASH', impactForce: gForce, timestamp: Date.now() };

      if (isOnline) {
        nav.navigate('CrashDetectionScreen', { impactForce: gForce });
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
      result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    } else {
      result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
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

    try {
      const res = await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/alerts/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      return res.ok ? data.url : null;
    } catch (error) {
      console.log('Upload error:', error);
      return null;
    }
  };

  /* ---------------- SOS HANDLER ---------------- */
  const handleSOS = async () => {
    if (!title.trim() || !description.trim()) {
      return Alert.alert('Missing Information', 'Please fill in both title and description');
    }

    setSending(true);

    try {
      const token = await AsyncStorage.getItem('token');
      
      let coords = locationCoords;
      if (!coords) {
        coords = await new Promise<Coords | null>((resolve) => {
          Geolocation.getCurrentPosition(
            pos => resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            }),
            () => resolve(null),
            { timeout: 10000 }
          );
        });
      }

      if (!coords) {
        setSending(false);
        return Alert.alert('Location Error', 'Unable to get your location. Please check GPS settings.');
      }

      const imageUrl = selectedImage ? await uploadImage() : null;

      const payload = {
        alert_type: 'accident',
        severity: 'high',
        title: title.trim(),
        description: description.trim(),
        location: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        latitude: coords.lat,
        longitude: coords.lng,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
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

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send SOS');
      }

      await saveHistoryEvent({
        id: `${Date.now()}`,
        type: 'SOS',
        timestamp: Date.now(),
        latitude: coords.lat,
        longitude: coords.lng,
        description: title.trim(),
      });

      if (bleReady) {
        await broadcastMeshPayload({
          id: `${Date.now()}`,
          latitude: coords.lat,
          longitude: coords.lng,
          type: 'SOS',
          impactForce: 0,
        });
      }

      const timeNow = new Date().toLocaleTimeString();
      Alert.alert(
        '🚨 SOS Sent Successfully',
        `Your emergency alert has been dispatched.\n\n📍 Location: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}\n⏰ Time: ${timeNow}\n\nEmergency services have been notified.`,
        [{ text: 'OK', onPress: () => console.log('SOS confirmed') }]
      );

      setModalVisible(false);
      setTitle('');
      setDescription('');
      setSelectedImage(null);
      stopPulse();

    } catch (err: any) {
      console.log('SOS Error:', err);
      Alert.alert('Error', err.message || 'Failed to send SOS. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getSpeedColor = () => {
    if (speed < 30) return '#34C759';
    if (speed < 60) return '#FF9F0A';
    return '#FF3B30';
  };

  const getSpeedWarning = () => {
    if (speed < 30) return { text: 'Normal', icon: '✓' };
    if (speed < 60) return { text: 'Caution', icon: '⚠️' };
    return { text: 'High Speed', icon: '⚠️' };
  };

  /* ---------------- UI RENDER ---------------- */
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A3C5F" />
      
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>RescueLink</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF9F0A' }]} />
            <Text style={styles.statusText}>
              {isOnline ? 'Emergency Services Connected' : 'Offline Mesh Mode Active'}
            </Text>
          </View>
          {bleReady && (
            <View style={styles.bleStatus}>
              <Icon name="bluetooth" size={14} color="#34C759" />
              <Text style={styles.bleStatusText}>Mesh Network Ready</Text>
            </View>
          )}
        </View>

        {/* Speed Card */}
        <View style={styles.speedCard}>
          <View style={styles.speedHeader}>
            <Text style={styles.cardLabel}>Current Speed</Text>
            <View style={[styles.warningBadge, { backgroundColor: getSpeedColor() + '20' }]}>
              <Text style={styles.warningIcon}>{getSpeedWarning().icon}</Text>
              <Text style={[styles.warningText, { color: getSpeedColor() }]}>
                {getSpeedWarning().text}
              </Text>
            </View>
          </View>
          <Text style={[styles.speedValue, { color: getSpeedColor() }]}>{Math.round(speed)}</Text>
          <Text style={styles.speedUnit}>km/h</Text>
          <View style={styles.speedBarContainer}>
            <View style={[styles.speedBar, { width: `${Math.min((speed / 140) * 100, 100)}%`, backgroundColor: getSpeedColor() }]} />
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Current Location</Text>
              <Text style={styles.infoValue}>
                {locationCoords 
                  ? `${locationCoords.lat.toFixed(4)}°, ${locationCoords.lng.toFixed(4)}°`
                  : 'Acquiring location...'}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📶</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Network Status</Text>
              <Text style={[styles.infoValue, { color: isOnline ? '#34C759' : '#FF9F0A' }]}>
                {isOnline ? 'Connected to emergency dispatch' : 'Mesh peer-to-peer mode'}
              </Text>
            </View>
          </View>
        </View>

        {/* SOS Button */}
        <Pressable
          delayLongPress={3000}
          onPressIn={() => {
            handlePressIn();
            startPulse();
          }}
          onPressOut={() => {
            handlePressOut();
            stopPulse();
          }}
          onLongPress={() => {
            playSOSSound();
            setModalVisible(true);
          }}
        >
          <Animated.View style={[styles.sosButton, { transform: [{ scale: sosScale }] }]}>
            <Text style={styles.sosText}>🚨 SOS</Text>
            <View style={styles.sosTimerRing}>
              <Text style={styles.sosSub}>HOLD FOR 3 SECONDS</Text>
            </View>
          </Animated.View>
        </Pressable>

        {/* Driving Mode Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>🚗</Text>
            <View>
              <Text style={styles.toggleTitle}>Driving Mode</Text>
              <Text style={styles.toggleSubtitle}>
                {drivingMode ? 'Auto-crash detection active' : 'Manual mode only'}
              </Text>
            </View>
          </View>
          <Switch 
            value={drivingMode} 
            onValueChange={setDrivingMode}
            trackColor={{ false: '#E5E5EA', true: '#FF3B30' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E5EA"
          />
        </View>

        {/* BLE Advertising Button */}
        <View style={styles.advertiseContainer}>
          <TouchableOpacity
            style={[styles.advertiseButton, isAdvertising && styles.advertiseButtonActive]}
            onPress={isAdvertising ? stopBLEAdvertising : startBLEAdvertising}
            activeOpacity={0.7}
          >
            <Icon name="bluetooth" size={20} color="#FFFFFF" />
            <Text style={styles.advertiseButtonText}>
              {isAdvertising ? 'STOP ADVERTISING' : 'MAKE DEVICE DISCOVERABLE'}
            </Text>
          </TouchableOpacity>
          {isAdvertising && (
            <Text style={styles.advertiseNote}>
              🔵 Your device is now visible to nearby RescueLink scanners
            </Text>
          )}
        </View>

        {/* Receiver Mode Button */}
        <TouchableOpacity
          style={styles.receiverButton}
          onPress={() => nav.navigate('BleReceiver')}
          activeOpacity={0.7}
        >
          <Text style={styles.receiverText}>OPEN RECEIVER MODE</Text>
        </TouchableOpacity>

        {/* Info Note */}
        {drivingMode && (
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              ⚡ Crash detection active • Emergency alerts will trigger automatically
            </Text>
          </View>
        )}

      </ScrollView>

      {/* SOS Modal */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🚨 Emergency Alert</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSubtitle}>Emergency Details</Text>

            <TextInput 
              style={styles.input} 
              placeholder="Incident Title (e.g., Car Accident, Medical Emergency)" 
              placeholderTextColor="#8E8E93"
              value={title} 
              onChangeText={setTitle} 
              maxLength={100}
            />

            <TextInput 
              style={[styles.input, styles.textArea]} 
              placeholder="Describe the emergency (location, injuries, vehicles involved...)" 
              placeholderTextColor="#8E8E93"
              value={description} 
              onChangeText={setDescription} 
              multiline 
              maxLength={500}
            />

            <Text style={styles.mediaLabel}>Add Evidence (Optional)</Text>
            <View style={styles.imageButtonsContainer}>
              <TouchableOpacity style={[styles.imageButton, styles.galleryBtn]} onPress={() => pickImage('gallery')}>
                <Text style={styles.imageButtonText}>📷 Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.imageButton, styles.cameraBtn]} onPress={() => pickImage('camera')}>
                <Text style={styles.imageButtonText}>📸 Camera</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: selectedImage.uri }} style={styles.thumbnail} />
                <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImage}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {sending ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF3B30" />
                <Text style={styles.loadingText}>Dispatching Emergency Services...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.submitBtn} onPress={handleSOS}>
                <Text style={styles.submitText}>SEND EMERGENCY ALERT</Text>
                <Text style={styles.submitSubtext}>Emergency services will be notified immediately</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    backgroundColor: '#0A3C5F',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#E5E5EA',
    fontSize: 13,
    fontWeight: '500',
  },
  bleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bleStatusText: {
    color: '#34C759',
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
  },
  speedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  speedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  warningIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
  },
  speedValue: {
    fontSize: 72,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -2,
    marginBottom: 4,
  },
  speedUnit: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  speedBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  speedBar: {
    height: '100%',
    borderRadius: 2,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 8,
  },
  sosButton: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#FF3B30',
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    paddingTop: 32,
  },
  sosTimerRing: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 28,
    marginTop: 8,
  },
  sosSub: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  toggleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  advertiseContainer: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  advertiseButton: {
    backgroundColor: '#5856D6',
    paddingVertical: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  advertiseButtonActive: {
    backgroundColor: '#FF3B30',
  },
  advertiseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  advertiseNote: {
    textAlign: 'center',
    color: '#34C759',
    fontSize: 12,
    marginTop: 8,
  },
  infoNote: {
    backgroundColor: '#FFE5E5',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    marginBottom: 24,
  },
  infoNoteText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  receiverButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  receiverText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF3B30',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#8E8E93',
  },
  modalSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 24,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  mediaLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 8,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  galleryBtn: {
    backgroundColor: '#007AFF',
  },
  cameraBtn: {
    backgroundColor: '#5856D6',
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreview: {
    alignItems: 'center',
    marginVertical: 16,
    position: 'relative',
  },
  thumbnail: {
    width: 150,
    height: 150,
    borderRadius: 12,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: width / 2 - 75,
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#8E8E93',
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  submitSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  cancelBtn: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});