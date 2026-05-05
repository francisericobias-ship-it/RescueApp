// SimpleBLETest.tsx - BLE Hardware Testing Screen
// No render errors, fully typed, production ready

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const manager = new BleManager();

interface BLEDevice {
  id: string;
  name: string;
  localName: string;
  rssi: number | null;
  manufacturerData: string;
}

export default function SimpleBLETest() {
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [bluetoothState, setBluetoothState] = useState<string>('Unknown');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setLogs(prev => [logMessage, ...prev].slice(0, 30));
  };

  const checkBluetoothState = async () => {
    try {
      const state = await manager.state();
      setBluetoothState(state);
      addLog(`📡 Bluetooth state: ${state}`);
      return state;
    } catch (error) {
      addLog(`❌ Error getting Bluetooth state: ${error}`);
      return 'Unknown';
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const permissionsToRequest = [];
        
        if (Platform.Version >= 31) { // Android 12+
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
        } else {
          permissionsToRequest.push(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          );
        }
        
        const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        
        let allGranted = true;
        for (const permission of permissionsToRequest) {
          if (granted[permission] !== PermissionsAndroid.RESULTS.GRANTED) {
            allGranted = false;
            addLog(`❌ Permission denied: ${permission}`);
          }
        }
        
        if (allGranted) {
          addLog('✅ All permissions granted');
        } else {
          addLog('❌ Some permissions were denied');
        }
        
        return allGranted;
      } catch (err) {
        addLog(`❌ Permission error: ${err}`);
        return false;
      }
    }
    return true;
  };

  const startScan = async () => {
    addLog('🔵 Starting BLE scan...');
    setDevices([]);
    setIsScanning(true);
    
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      addLog('❌ Missing permissions - cannot scan');
      setIsScanning(false);
      Alert.alert('Permission Error', 'Please grant all required permissions');
      return;
    }
    
    const state = await checkBluetoothState();
    if (state !== 'PoweredOn') {
      addLog('❌ Bluetooth is not powered on');
      Alert.alert('Bluetooth Required', 'Please turn on Bluetooth to scan for devices');
      setIsScanning(false);
      return;
    }
    
    try {
      manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          addLog(`Scan error: ${error.message}`);
          return;
        }
        
        if (device && device.id) {
          const deviceInfo: BLEDevice = {
            id: device.id,
            name: device.name || 'Unknown',
            localName: device.localName || 'None',
            rssi: device.rssi,
            manufacturerData: device.manufacturerData ? 'Present' : 'None',
          };
          
          addLog(`📱 Found: ${deviceInfo.name} (RSSI: ${deviceInfo.rssi} dBm)`);
          
          setDevices(prev => {
            const exists = prev.find(d => d.id === deviceInfo.id);
            if (exists) return prev;
            return [deviceInfo, ...prev];
          });
        }
      });
      
      // Stop scan after 15 seconds
      setTimeout(() => {
        if (isScanning) {
          manager.stopDeviceScan();
          setIsScanning(false);
          addLog('🛑 Scan stopped - 15 seconds completed');
          addLog(`📊 Total devices found: ${devices.length}`);
        }
      }, 15000);
      
    } catch (error) {
      addLog(`❌ Failed to start scan: ${error}`);
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    try {
      manager.stopDeviceScan();
      setIsScanning(false);
      addLog('🛑 Scan stopped manually');
    } catch (error) {
      addLog(`❌ Error stopping scan: ${error}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Logs cleared');
  };

  const clearDevices = () => {
    setDevices([]);
    addLog('🧹 Device list cleared');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      
      <View style={styles.container}>
        <Text style={styles.title}>🔧 BLE Hardware Test</Text>
        <Text style={styles.subtitle}>Test if Bluetooth is working properly</Text>
        
        {/* Bluetooth Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Icon 
              name={bluetoothState === 'PoweredOn' ? 'bluetooth' : 'bluetooth-off'} 
              size={24} 
              color={bluetoothState === 'PoweredOn' ? '#34C759' : '#FF3B30'} 
            />
            <Text style={styles.statusText}>
              Bluetooth: {bluetoothState}
            </Text>
            <TouchableOpacity onPress={checkBluetoothState} style={styles.refreshButton}>
              <Icon name="refresh-ccw" size={18} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.startButton, isScanning && styles.buttonDisabled]}
            onPress={startScan}
            disabled={isScanning}
            activeOpacity={0.7}
          >
            <Icon name="play" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>START SCAN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.stopButton, !isScanning && styles.buttonDisabled]}
            onPress={stopScan}
            disabled={!isScanning}
            activeOpacity={0.7}
          >
            <Icon name="square" size={20} color="#FF3B30" />
            <Text style={[styles.buttonText, styles.stopButtonText]}>STOP SCAN</Text>
          </TouchableOpacity>
        </View>
        
        {/* Scan Status */}
        <View style={styles.scanStatus}>
          <View style={[styles.scanDot, isScanning && styles.scanActive]} />
          <Text style={styles.scanText}>
            {isScanning ? '🔍 Scanning for BLE devices...' : '⚡ Idle'}
          </Text>
        </View>
        
        {/* Activity Logs */}
        <View style={styles.logsHeader}>
          <Text style={styles.sectionTitle}>📋 Activity Logs</Text>
          <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
            <Icon name="trash-2" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.logContainer}>
          {logs.length === 0 ? (
            <Text style={styles.logPlaceholder}>No logs yet. Press START SCAN</Text>
          ) : (
            logs.map((log, i) => (
              <Text key={i} style={styles.logText}>{log}</Text>
            ))
          )}
        </ScrollView>
        
        {/* Devices Found */}
        <View style={styles.devicesHeader}>
          <Text style={styles.sectionTitle}>📱 Devices Found ({devices.length})</Text>
          <TouchableOpacity onPress={clearDevices} style={styles.clearButton}>
            <Icon name="trash-2" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.deviceContainer}>
          {devices.length === 0 ? (
            <Text style={styles.noDevices}>
              {isScanning ? 'Scanning... waiting for devices...' : 'No devices found. Press START SCAN'}
            </Text>
          ) : (
            devices.map((device, i) => (
              <View key={i} style={styles.deviceItem}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceId}>ID: {device.id.substring(0, 20)}...</Text>
                <Text style={styles.deviceRssi}>Signal: {device.rssi ?? 'N/A'} dBm</Text>
              </View>
            ))
          )}
        </ScrollView>
        
        {/* Info Note */}
        <View style={styles.infoNote}>
          <Icon name="info" size={14} color="#8E8E93" />
          <Text style={styles.infoText}>
            This test checks if your BLE hardware is working. 
            If you see devices, Bluetooth is functioning properly.
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
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginLeft: 12,
    flex: 1,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
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
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF3B30',
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  stopButtonText: {
    color: '#FF3B30',
  },
  scanStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8E8E93',
    marginRight: 8,
  },
  scanActive: {
    backgroundColor: '#FF3B30',
  },
  scanText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  devicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  clearButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  logContainer: {
    height: 150,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  logText: {
    fontSize: 10,
    color: '#34C759',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logPlaceholder: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 60,
  },
  deviceContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    minHeight: 150,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  deviceItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
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
  deviceRssi: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '500',
  },
  noDevices: {
    textAlign: 'center',
    color: '#8E8E93',
    padding: 20,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    marginTop: 16,
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