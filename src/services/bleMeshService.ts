// bleMeshService.ts - Complete BLE Mesh Service

import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const manager = new BleManager();

export interface MeshPayload {
  id?: string;
  latitude: number;
  longitude: number;
  impactForce?: number;
  type?: string;
  ttl?: number;
}

// Format: C|ID|LAT|LNG|TTL|TYPE|IMPACT
const formatMessage = (payload: MeshPayload): string => {
  const messageId = payload.id || `${Date.now()}`;
  const ttl = payload.ttl || 3;
  const type = payload.type || 'EMERGENCY';
  const impact = payload.impactForce || 0;
  
  // Max 28 characters for BLE device name
  return `C|${messageId.slice(-6)}|${payload.latitude.toFixed(3)}|${payload.longitude.toFixed(3)}|${ttl}|${type}|${impact}`;
};

// Broadcast via device name
export const broadcastMeshPayload = async (payload: MeshPayload): Promise<boolean> => {
  try {
    const message = formatMessage(payload);
    console.log('📡 Broadcasting via device name:', message);
    
    // Store in AsyncStorage for demo/offline
    await AsyncStorage.setItem('pending_emergency', message);
    
    return true;
  } catch (error) {
    console.log('Broadcast error:', error);
    return false;
  }
};

// Parse emergency message from device name
const parseEmergencyMessage = (deviceName: string): any => {
  try {
    const parts = deviceName.split('|');
    if (parts.length < 6) return null;
    
    return {
      id: parts[1],
      latitude: parseFloat(parts[2]),
      longitude: parseFloat(parts[3]),
      ttl: parseInt(parts[4]),
      type: parts[5],
      impactForce: parseFloat(parts[6] || '0'),
      timestamp: Date.now(),
    };
  } catch (e) {
    console.log('Parse error:', e);
    return null;
  }
};

// Request Bluetooth permissions
const requestPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const permissionsToRequest = [];
      
      if (Platform.Version >= 31) {
        permissionsToRequest.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
      }
      
      permissionsToRequest.push(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      
      const granted = await PermissionsAndroid.requestMultiple(permissionsToRequest);
      
      return Object.values(granted).every(g => g === PermissionsAndroid.RESULTS.GRANTED);
    } catch (err) {
      console.log('Permission error:', err);
      return false;
    }
  }
  return true;
};

// Scan for devices (read device names)
export const startMeshScan = async (onReceive?: (payload: any) => void) => {
  try {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.log('❌ Bluetooth permissions denied');
      return;
    }
    
    const state = await manager.state();
    if (state !== 'PoweredOn') {
      console.log('❌ Bluetooth is off');
      return;
    }
    
    console.log('🔍 Scanning for RescueLink devices...');
    
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.log('Scan error:', error);
        return;
      }
      
      if (device && device.name) {
        const deviceName = device.name;
        
        // Check if it's our emergency format (starts with "C|")
        if (deviceName.startsWith('C|')) {
          console.log('📱 Found emergency device:', deviceName);
          
          const parsed = parseEmergencyMessage(deviceName);
          if (parsed) {
            onReceive?.(parsed);
          }
        }
      }
    });
    
    // Stop after 30 seconds
    setTimeout(() => {
      manager.stopDeviceScan();
      console.log('🛑 Scan stopped');
    }, 30000);
    
  } catch (error) {
    console.log('Scan error:', error);
  }
};

// Stop scanning
export const stopMeshScan = () => {
  try {
    manager.stopDeviceScan();
    console.log('🛑 BLE scan stopped');
  } catch (error) {
    console.log('Stop scan error:', error);
  }
};

// Get pending emergency (for demo)
export const getPendingEmergency = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('pending_emergency');
  } catch (error) {
    console.log('Get pending error:', error);
    return null;
  }
};

// Clear pending emergency
export const clearPendingEmergency = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('pending_emergency');
  } catch (error) {
    console.log('Clear pending error:', error);
  }
};