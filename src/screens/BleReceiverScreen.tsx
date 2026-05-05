// BleReceiverScreen.tsx - COMPLETE FIXED VERSION with Device Name Parsing

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  Animated,
  RefreshControl,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startScanning, stopScanning } from '../native/BLEAdvertiser';
import socket from '../services/socket';

interface EmergencyData {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  impactForce: number;
  timestamp: number;
  sourceDevice?: string;
}

interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  data?: string;
}

export default function BleReceiverScreen() {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyData[]>([]);
  const [status, setStatus] = useState('Ready');
  const [isScanning, setIsScanning] = useState(false);
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Socket.io connection
  useEffect(() => {
    if (socket.connected) {
      setIsConnected(true);
      setStatus('Online - Connected');
    } else {
      socket.connect();
    }

    socket.on('connect', () => {
      setIsConnected(true);
      setStatus('Online - Monitoring');
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
      setStatus('Disconnected');
    });
    
    socket.on('emergency', (data: EmergencyData) => {
      console.log('🚨 Socket Emergency Received:', data);
      setEmergencies(prev => [data, ...prev]);
      setMessagesReceived(prev => prev + 1);
      setLastMessageTime(new Date());
      setStatus(`🚨 EMERGENCY received!`);
      Vibration.vibrate([0, 500, 200, 500]);
      
      Alert.alert(
        '🚨 EMERGENCY ALERT',
        `Type: ${data.type}\n📍 Location: ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
        [{ text: 'OK', style: 'default' }]
      );
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('emergency');
    };
  }, []);

  useEffect(() => {
    if (isScanning) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isScanning]);

  // Parse emergency from device name (short message format)
  const parseEmergencyFromDeviceName = (deviceName: string): EmergencyData | null => {
    // Format: E|LAT|LNG|TYPE
    // Example: E|14.599|120.984|S
    if (deviceName && deviceName.startsWith('E|')) {
      try {
        const parts = deviceName.split('|');
        if (parts.length >= 4) {
          const typeCode = parts[3];
          let type = 'EMERGENCY';
          if (typeCode === 'S') type = 'SOS';
          else if (typeCode === 'C') type = 'CRASH';
          else if (typeCode === 'M') type = 'MEDICAL';
          
          return {
            id: `emergency_${Date.now()}`,
            type: type,
            latitude: parseFloat(parts[1]),
            longitude: parseFloat(parts[2]),
            impactForce: 0,
            timestamp: Date.now(),
          };
        }
      } catch (e) {
        console.log('Parse error:', e);
      }
    }
    return null;
  };

  const handleStartScan = async () => {
    try {
      setStatus('Scanning for devices...');
      setIsScanning(true);
      setDevices([]);
      
      const foundDevices = await startScanning();
      
      setDevices(foundDevices);
      setStatus(foundDevices.length > 0 ? `Found ${foundDevices.length} device(s)` : 'No devices found');
      
      // Check if any device has emergency data (from service data)
      for (const device of foundDevices) {
        if (device.data) {
          try {
            const emergency = JSON.parse(device.data);
            setEmergencies(prev => [emergency, ...prev]);
            setMessagesReceived(prev => prev + 1);
            setLastMessageTime(new Date());
            setStatus(`🚨 EMERGENCY from ${device.name}!`);
            Vibration.vibrate([0, 500, 200, 500]);
            
            Alert.alert(
              '🚨 EMERGENCY ALERT',
              `Emergency signal from ${device.name}\n📍 Location: ${emergency.latitude?.toFixed(4)}, ${emergency.longitude?.toFixed(4)}`,
              [{ text: 'OK', style: 'default' }]
            );
          } catch (e) {
            console.log('Parse error:', e);
          }
        }
        
        // ✅ Check device name for short emergency message format
        const emergencyFromName = parseEmergencyFromDeviceName(device.name);
        if (emergencyFromName) {
          console.log('🚨 Emergency detected from device name:', device.name);
          setEmergencies(prev => [emergencyFromName, ...prev]);
          setMessagesReceived(prev => prev + 1);
          setLastMessageTime(new Date());
          setStatus(`🚨 ${emergencyFromName.type} from ${device.name}!`);
          Vibration.vibrate([0, 500, 200, 500]);
          
          Alert.alert(
            `🚨 ${emergencyFromName.type} ALERT`,
            `Emergency signal from ${device.name}\n📍 Location: ${emergencyFromName.latitude.toFixed(4)}, ${emergencyFromName.longitude.toFixed(4)}`,
            [{ text: 'OK', style: 'default' }]
          );
        }
      }
      
      setIsScanning(false);
      
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert('Error', 'Failed to start BLE scanning');
      setStatus('Failed to start ❌');
      setIsScanning(false);
    }
  };

  const handleStopScan = () => {
    stopScanning();
    setIsScanning(false);
    setStatus('Scanning stopped');
  };

  const refreshScan = () => {
    setRefreshing(true);
    handleStopScan();
    setDevices([]);
    handleStartScan().finally(() => setRefreshing(false));
  };

  const formatTime = (date: Date) => date.toLocaleTimeString();

  const getSignalStrengthColor = (rssi: number) => {
    if (rssi > -50) return '#34C759';
    if (rssi > -70) return '#FF9F0A';
    return '#FF3B30';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="shield" size={32} color="#FF3B30" />
          </View>
          <Text style={styles.headerTitle}>Emergency Monitor</Text>
          <Text style={styles.headerSubtitle}>Real-time emergency alerts</Text>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshScan} colors={['#007AFF']} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Icon 
                name={isScanning ? 'radio' : (isConnected ? 'wifi' : 'bluetooth')} 
                size={24} 
                color={isScanning ? '#FF9F0A' : (isConnected ? '#34C759' : '#8E8E93')} 
              />
              <Text style={[styles.statusText, { color: isScanning ? '#FF9F0A' : (isConnected ? '#34C759' : '#8E8E93') }]}>
                {status}
              </Text>
            </View>
            
            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.scanningText}>Looking for RescueLink devices...</Text>
              </View>
            )}
          </View>

          {/* Stats Card */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Icon name="bluetooth" size={20} color="#007AFF" />
              <Text style={styles.statLabel}>Devices</Text>
              <Text style={styles.statValue}>{devices.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="alert-triangle" size={20} color="#FF3B30" />
              <Text style={styles.statLabel}>Emergencies</Text>
              <Text style={styles.statValue}>{messagesReceived}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Icon name="wifi" size={20} color={isConnected ? '#34C759' : '#8E8E93'} />
              <Text style={styles.statLabel}>Network</Text>
              <Text style={styles.statValue}>{isConnected ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable 
              style={[styles.button, styles.startButton, isScanning && styles.buttonDisabled]} 
              onPress={handleStartScan} 
              disabled={isScanning}
            >
              <Icon name="play" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>SCAN DEVICES</Text>
            </Pressable>
            <Pressable 
              style={[styles.button, styles.stopButton, !isScanning && styles.buttonDisabled]} 
              onPress={handleStopScan} 
              disabled={!isScanning}
            >
              <Icon name="square" size={20} color="#FF3B30" />
              <Text style={[styles.buttonText, styles.stopButtonText]}>STOP SCAN</Text>
            </Pressable>
          </View>

          {/* Devices List Header */}
          <View style={styles.devicesHeader}>
            <Text style={styles.sectionTitle}>Nearby Devices ({devices.length})</Text>
          </View>
          
          {/* Devices List */}
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
                <Text style={styles.noDevicesSubtext}>Looking for RescueLink devices</Text>
              </View>
            )}
            
            {devices.map((device, index) => (
              <View key={index} style={styles.deviceItem}>
                <View style={styles.deviceIcon}>
                  <Icon name="smartphone" size={24} color="#007AFF" />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceId}>ID: {device.id.slice(-12)}</Text>
                  <View style={styles.signalRow}>
                    <View style={[styles.signalBar, { backgroundColor: getSignalStrengthColor(device.rssi) }]} />
                    <Text style={styles.deviceSignal}>
                      Signal: {device.rssi} dBm
                    </Text>
                  </View>
                </View>
                {device.data && (
                  <View style={styles.emergencyBadge}>
                    <Text style={styles.emergencyBadgeText}>SOS</Text>
                  </View>
                )}
                {/* Show indicator if device name contains emergency format */}
                {device.name && device.name.startsWith('E|') && (
                  <View style={styles.emergencyIndicator}>
                    <Text style={styles.emergencyIndicatorText}>🚨</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Emergency Alerts Header */}
          <Text style={[styles.sectionTitle, styles.emergencyHeaderSpacing]}>
            Emergency Alerts ({emergencies.length})
          </Text>
          
          {/* Emergency Alerts List */}
          <ScrollView style={styles.emergencyList} showsVerticalScrollIndicator={false}>
            {emergencies.length === 0 && (
              <View style={styles.noEmergencies}>
                <Icon name="check-circle" size={48} color="#34C759" />
                <Text style={styles.noEmergenciesText}>No emergencies</Text>
                <Text style={styles.noEmergenciesSubtext}>All clear! Stay safe.</Text>
              </View>
            )}
            
            {emergencies.map((emergency, index) => (
              <View key={index} style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <Icon name="alert-triangle" size={20} color="#FF3B30" />
                  <Text style={styles.emergencyTitle}>EMERGENCY DETECTED!</Text>
                </View>
                <Text style={styles.emergencyType}>Type: {emergency.type}</Text>
                <Text style={styles.emergencyLocation}>
                  📍 {emergency.latitude.toFixed(4)}°, {emergency.longitude.toFixed(4)}°
                </Text>
                {emergency.impactForce > 0 && (
                  <Text style={styles.emergencyImpact}>💥 Impact: {emergency.impactForce.toFixed(2)} G</Text>
                )}
                <Text style={styles.emergencyTime}>
                  🕐 {new Date(emergency.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))}
          </ScrollView>
        </ScrollView>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Icon name="info" size={16} color="#8E8E93" />
          <Text style={styles.infoText}>
            Make sure Bluetooth is enabled. This scans for nearby RescueLink devices and emergency signals.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B3015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
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
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 16,
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
    maxHeight: 300,
    marginBottom: 16,
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
  deviceIcon: {
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
  emergencyBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emergencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  emergencyIndicator: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  emergencyIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
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
  emergencyHeaderSpacing: {
    marginTop: 16,
    marginBottom: 12,
  },
  emergencyList: {
    marginBottom: 16,
  },
  emergencyCard: {
    backgroundColor: '#FF3B3015',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    marginLeft: 8,
    flex: 1,
  },
  emergencyType: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 4,
  },
  emergencyLocation: {
    fontSize: 13,
    color: '#007AFF',
    marginBottom: 4,
  },
  emergencyImpact: {
    fontSize: 13,
    color: '#FF9F0A',
    marginBottom: 4,
  },
  emergencyTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 8,
  },
  noEmergencies: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  noEmergenciesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 12,
  },
  noEmergenciesSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
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
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 10,
    lineHeight: 18,
  },
});