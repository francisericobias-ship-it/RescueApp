// BleBroadcastScreen.tsx - Complete BLE Scanner with Short BLE Message

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  Alert,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { startScanning, stopScanning, startAdvertising, stopAdvertising } from '../native/BLEAdvertiser';

interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  data?: string;
}

export default function BleBroadcastScreen() {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState('Ready to scan');
  const [selectedDevice, setSelectedDevice] = useState<BLEDevice | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [deviceId, setDeviceId] = useState<string>('');
  const [sending, setSending] = useState(false);
  
  const navigation = useNavigation<any>();
  const isMounted = useRef(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();
    
    initDevice();
    
    return () => {
      isMounted.current = false;
      pulse.stop();
      stopScanning();
      stopAdvertising();
    };
  }, []);

  const initDevice = async () => {
    try {
      let storedDeviceId = await AsyncStorage.getItem('device_id');
      if (!storedDeviceId) {
        storedDeviceId = await DeviceInfo.getUniqueId();
        await AsyncStorage.setItem('device_id', storedDeviceId);
      }
      setDeviceId(storedDeviceId);
      getCurrentLocation();
    } catch (error) {
      console.log('Init error:', error);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => console.log('Location error:', error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startScan = async () => {
    try {
      setStatus('Scanning for Bluetooth devices...');
      setIsScanning(true);
      setDevices([]);
      setSelectedDevice(null);
      
      const foundDevices = await startScanning();
      
      setDevices(foundDevices);
      setStatus(foundDevices.length > 0 ? `Found ${foundDevices.length} device(s)` : 'No devices found');
      setIsScanning(false);
      
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to start BLE scanning');
      setStatus('Failed to start ❌');
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    stopScanning();
    setIsScanning(false);
    setStatus('Scanning stopped');
  };

  const refreshScan = () => {
    setRefreshing(true);
    stopScan();
    setDevices([]);
    startScan().finally(() => {
      setRefreshing(false);
    });
  };

  const sendEmergencyToAPI = async (latitude: number, longitude: number): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('token');
      const timestamp = Math.floor(Date.now() / 1000);
      
      const response = await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          device_id: deviceId,
          latitude: latitude,
          longitude: longitude,
          timestamp: timestamp,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Emergency sent to API successfully');
        return true;
      } else {
        console.log('❌ API emergency failed:', result.message);
        return false;
      }
    } catch (error) {
      console.log('❌ Network error:', error);
      return false;
    }
  };

  // SHORT BLE MESSAGE - para iwas "data too large" error
  const sendEmergencyToDevice = async (device: BLEDevice) => {
    if (!location) {
      Alert.alert('Location Error', 'Unable to get your location. Please enable GPS.');
      return;
    }
    
    if (sending) return;
    
    setSending(true);
    setSelectedDevice(device);
    setStatus(`Sending emergency alert to ${device.name}...`);
    
    try {
      // Sobrang ikling message (max 20-25 characters)
      // Format: E|LAT|LNG|TYPE
      // Example: E|14.599|120.984|S
      const shortMessage = `E|${location.lat.toFixed(3)}|${location.lng.toFixed(3)}|S`;
      
      console.log('📡 BLE Broadcast short message:', shortMessage);
      const broadcastSuccess = await startAdvertising(shortMessage);
      console.log('BLE Broadcast result:', broadcastSuccess);
      
      // Send to API for admin
      const apiSuccess = await sendEmergencyToAPI(location.lat, location.lng);
      
      if (broadcastSuccess || apiSuccess) {
        // Save to local history
        const emergencyRecord = {
          id: `emergency_${Date.now()}`,
          device_id: deviceId,
          target_device: device.id,
          target_name: device.name,
          latitude: location.lat,
          longitude: location.lng,
          timestamp: Date.now(),
          sent_via_broadcast: broadcastSuccess,
          sent_via_api: apiSuccess,
        };
        
        const history = await AsyncStorage.getItem('emergency_history');
        const emergencies = history ? JSON.parse(history) : [];
        emergencies.unshift(emergencyRecord);
        await AsyncStorage.setItem('emergency_history', JSON.stringify(emergencies.slice(0, 50)));
        
        setStatus(`✅ Emergency alert sent to ${device.name}!`);
        Alert.alert(
          'Emergency Sent', 
          `Alert has been sent to ${device.name}\n\n📍 ${location.lat.toFixed(4)}°, ${location.lng.toFixed(4)}°`
        );
        
        setTimeout(() => {
          if (navigation.canGoBack()) navigation.goBack();
        }, 2000);
      } else {
        throw new Error('Failed to send via both methods');
      }
      
    } catch (error) {
      console.log('Send error:', error);
      setStatus('Failed to send ❌');
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getSignalStrengthColor = (rssi: number) => {
    if (rssi > -50) return '#34C759';
    if (rssi > -70) return '#FF9F0A';
    return '#FF3B30';
  };

  const getSignalStrengthText = (rssi: number) => {
    if (rssi > -50) return 'Excellent';
    if (rssi > -70) return 'Good';
    return 'Weak';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A3C5F" />
      
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Emergency Alert</Text>
          <Text style={styles.headerSubtitle}>Send your location to emergency services</Text>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshScan} colors={['#007AFF']} />
          }
        >
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconInner}>
              <Icon name="alert-triangle" size={64} color="#FF3B30" />
            </View>
          </Animated.View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon name={isScanning ? 'radio' : 'bluetooth'} size={24} color={isScanning ? '#FF9F0A' : '#007AFF'} />
              <Text style={[styles.statusText, { color: isScanning ? '#FF9F0A' : '#007AFF' }]}>
                {status}
              </Text>
            </View>
            
            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.scanningText}>Looking for Bluetooth devices...</Text>
              </View>
            )}
          </View>

          {location && (
            <View style={styles.locationCard}>
              <Icon name="map-pin" size={16} color="#007AFF" />
              <Text style={styles.locationText}>
                📍 Your location: {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.startButton, isScanning && styles.buttonDisabled]}
              onPress={startScan}
              disabled={isScanning}
            >
              <Icon name="play" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>SCAN DEVICES</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.stopButton, !isScanning && styles.buttonDisabled]}
              onPress={stopScan}
              disabled={!isScanning}
            >
              <Icon name="square" size={20} color="#FF3B30" />
              <Text style={[styles.buttonText, styles.stopButtonText]}>STOP</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.devicesHeader}>
            <Text style={styles.sectionTitle}>Nearby Devices ({devices.length})</Text>
          </View>
          
          <ScrollView style={styles.deviceList} showsVerticalScrollIndicator={false}>
            {devices.length === 0 && !isScanning && (
              <View style={styles.noDevices}>
                <Icon name="bluetooth-off" size={48} color="#C6C6C8" />
                <Text style={styles.noDevicesText}>No devices found</Text>
                <Text style={styles.noDevicesSubtext}>Press SCAN DEVICES to discover</Text>
              </View>
            )}
            
            {devices.length === 0 && isScanning && (
              <View style={styles.noDevices}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.noDevicesText}>Scanning...</Text>
                <Text style={styles.noDevicesSubtext}>Waiting for Bluetooth devices</Text>
              </View>
            )}
            
            {devices.map((device, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.deviceItem,
                  selectedDevice?.id === device.id && styles.deviceItemSelected,
                ]}
                onPress={() => sendEmergencyToDevice(device)}
                disabled={sending}
              >
                <View style={styles.deviceIconContainer}>
                  <Icon name="smartphone" size={24} color="#007AFF" />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceId}>ID: {device.id.slice(-12)}</Text>
                  <View style={styles.signalRow}>
                    <View style={[styles.signalBar, { backgroundColor: getSignalStrengthColor(device.rssi) }]} />
                    <Text style={styles.deviceSignal}>
                      {getSignalStrengthText(device.rssi)} ({device.rssi} dBm)
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color="#C6C6C8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.broadcastInfo}>
            <Icon name="bluetooth" size={16} color="#007AFF" />
            <Text style={styles.broadcastInfoText}>
              When you tap a device, it will broadcast an emergency signal via BLE.
              Make sure the receiver is scanning.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.infoNote}>
          <Icon name="info" size={14} color="#8E8E93" />
          <Text style={styles.infoText}>
            Make sure Bluetooth is enabled. Tap on any device to send your location to emergency services and BLE broadcast.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A3C5F',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#0A3C5F',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B3015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  scanningText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 10,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  locationText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 6,
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  stopButtonText: {
    color: '#FF3B30',
  },
  devicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  deviceList: {
    maxHeight: 400,
    marginBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  deviceItemSelected: {
    backgroundColor: '#007AFF10',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  deviceId: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  signalBar: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  deviceSignal: {
    fontSize: 11,
    color: '#8E8E93',
  },
  noDevices: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  noDevicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 12,
  },
  noDevicesSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  broadcastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  broadcastInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 10,
    lineHeight: 16,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 14,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 10,
    lineHeight: 16,
  },
});