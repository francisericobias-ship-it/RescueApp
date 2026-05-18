// bleMeshService.ts - Complete BLE Mesh Service with User Names

import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import NetInfo from '@react-native-community/netinfo';
import { startAdvertising, stopAdvertising } from '../native/BLEAdvertiser';

const manager = new BleManager();

export interface MeshPayload {
  id?: string;
  latitude: number;
  longitude: number;
  impactForce?: number;
  type?: string;
  ttl?: number;
}

// Get user's first name from storage
const getUserFirstName = async (): Promise<string> => {
  let firstName = await AsyncStorage.getItem('user_first_name');
  if (!firstName) {
    firstName = 'Rescue';
    await AsyncStorage.setItem('user_first_name', firstName);
  }
  return firstName;
};

// Get user's last name from storage
const getUserLastName = async (): Promise<string> => {
  let lastName = await AsyncStorage.getItem('user_last_name');
  if (!lastName) {
    lastName = 'User';
    await AsyncStorage.setItem('user_last_name', lastName);
  }
  return lastName;
};

// Get short device ID (6 characters)
const getShortDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem('short_device_id');
  if (!deviceId) {
    const fullId = await DeviceInfo.getUniqueId();
    deviceId = fullId.slice(-6);
    await AsyncStorage.setItem('short_device_id', deviceId);
  }
  return deviceId;
};

// ✅ FULL FORMAT - With first name and last name
// Format: E|DEVICE_ID|FIRST|LAST|LAT|LNG|TYPE
// Example: E|A12345|John|Doe|14.6|120.9|S
const formatFullMessage = async (payload: MeshPayload): Promise<string> => {
  const deviceId = await getShortDeviceId();
  const firstName = await getUserFirstName();
  const lastName = await getUserLastName();
  const lat = payload.latitude.toFixed(1);
  const lng = payload.longitude.toFixed(1);
  
  let typeCode = 'E';
  if (payload.type === 'SOS') typeCode = 'S';
  else if (payload.type === 'CRASH') typeCode = 'C';
  
  // Limit names to 10 characters each para kasya sa BLE
  const shortFirstName = firstName.substring(0, 10);
  const shortLastName = lastName.substring(0, 10);
  
  return `E|${deviceId}|${shortFirstName}|${shortLastName}|${lat}|${lng}|${typeCode}`;
};

// ✅ SHORT FORMAT - Without names (kasya sa 31 bytes)
// Format: E|DEVICE_ID|LAT|LNG|TYPE
// Example: E|A12345|14.6|120.9|S
const formatShortMessage = async (payload: MeshPayload): Promise<string> => {
  const deviceId = await getShortDeviceId();
  const lat = payload.latitude.toFixed(1);
  const lng = payload.longitude.toFixed(1);
  
  let typeCode = 'E';
  if (payload.type === 'SOS') typeCode = 'S';
  else if (payload.type === 'CRASH') typeCode = 'C';
  
  return `E|${deviceId}|${lat}|${lng}|${typeCode}`;
};

// ✅ MINIMAL FORMAT - No device ID (for testing)
const formatMinimalMessage = (payload: MeshPayload): string => {
  const lat = payload.latitude.toFixed(1);
  const lng = payload.longitude.toFixed(1);
  
  let typeCode = 'E';
  if (payload.type === 'SOS') typeCode = 'S';
  else if (payload.type === 'CRASH') typeCode = 'C';
  
  return `E|${lat}|${lng}|${typeCode}`;
};

// ✅ FIXED: Actual BLE broadcast using native module
export const broadcastMeshPayload = async (payload: MeshPayload): Promise<boolean> => {
  try {
    const netInfo = await NetInfo.fetch();
    const hasInternet = netInfo.isConnected ?? false;
    
    // Try full format first (with names)
    let message = await formatFullMessage(payload);
    
    // If message is too long, fallback to short format
    if (message.length > 31) {
      console.log('⚠️ Full message too long, using short format');
      message = await formatShortMessage(payload);
    }
    
    console.log('📡 Broadcasting via BLE:', message);
    console.log(`📡 Message length: ${message.length} bytes`);
    console.log(`🌐 Device has internet: ${hasInternet}`);
    
    if (message.length > 31) {
      console.log(`❌ Message too long (${message.length} bytes). Max is 31!`);
      return false;
    }
    
    // Only broadcast if NO internet (gateway mode)
    if (!hasInternet) {
      console.log('📡 No internet - Broadcasting via BLE for gateway');
      const result = await startAdvertising(message);
      
      if (result) {
        console.log('✅ BLE broadcast successful');
        await AsyncStorage.setItem('pending_emergency', message);
        return true;
      } else {
        console.log('❌ BLE broadcast failed');
        await AsyncStorage.setItem('pending_emergency', message);
        return true;
      }
    } else {
      console.log('🌐 Has internet - Skipping BLE broadcast');
      return false;
    }
  } catch (error) {
    console.log('Broadcast error:', error);
    try {
      const fallbackMessage = formatMinimalMessage(payload);
      await AsyncStorage.setItem('pending_emergency', fallbackMessage);
      console.log('📡 Fallback: Saved to AsyncStorage:', fallbackMessage);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// ✅ Parse emergency message (supports multiple formats)
export const parseEmergencyMessage = (deviceName: string): any => {
  if (!deviceName || !deviceName.startsWith('E|')) return null;
  
  try {
    const parts = deviceName.split('|');
    console.log('📝 Parsing device name:', deviceName, 'Parts:', parts.length);
    
    // Format 1: E|DEVICE_ID|FIRST|LAST|LAT|LNG|TYPE (7 parts)
    if (parts.length >= 7) {
      return {
        id: `emergency_${Date.now()}`,
        senderDeviceId: parts[1],
        senderFirstName: parts[2],
        senderLastName: parts[3],
        latitude: parseFloat(parts[4]),
        longitude: parseFloat(parts[5]),
        type: parts[6] === 'S' ? 'SOS' : parts[6] === 'C' ? 'CRASH' : 'EMERGENCY',
        timestamp: Date.now(),
      };
    }
    
    // Format 2: E|DEVICE_ID|LAT|LNG|TYPE (5 parts)
    if (parts.length >= 5) {
      return {
        id: `emergency_${Date.now()}`,
        senderDeviceId: parts[1],
        senderFirstName: parts[1],
        senderLastName: '',
        latitude: parseFloat(parts[2]),
        longitude: parseFloat(parts[3]),
        type: parts[4] === 'S' ? 'SOS' : parts[4] === 'C' ? 'CRASH' : 'EMERGENCY',
        timestamp: Date.now(),
      };
    }
    
    // Format 3: E|LAT|LNG|TYPE (4 parts)
    if (parts.length >= 4) {
      return {
        id: `emergency_${Date.now()}`,
        senderDeviceId: 'unknown',
        senderFirstName: 'Unknown',
        senderLastName: 'User',
        latitude: parseFloat(parts[1]),
        longitude: parseFloat(parts[2]),
        type: parts[3] === 'S' ? 'SOS' : parts[3] === 'C' ? 'CRASH' : 'EMERGENCY',
        timestamp: Date.now(),
      };
    }
  } catch (e) {
    console.log('Parse error:', e);
  }
  return null;
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
        console.log('📱 Found device:', deviceName);
        
        if (deviceName.startsWith('E|')) {
          console.log('📱 Found emergency device:', deviceName);
          
          const parsed = parseEmergencyMessage(deviceName);
          if (parsed) {
            console.log('✅ Emergency data received:', parsed);
            if (!parsed.senderDeviceId) {
              parsed.senderDeviceId = device.id;
            }
            onReceive?.(parsed);
          }
        }
      }
    });
    
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

// Get pending emergency
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

// Save user name to storage (call this after login)
export const saveUserName = async (firstName: string, lastName: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('user_first_name', firstName);
    await AsyncStorage.setItem('user_last_name', lastName);
    console.log('✅ User name saved:', firstName, lastName);
  } catch (error) {
    console.log('Failed to save user name:', error);
  }
};

// Get user name
export const getUserName = async (): Promise<{ firstName: string; lastName: string }> => {
  const firstName = await getUserFirstName();
  const lastName = await getUserLastName();
  return { firstName, lastName };
};

// Get short device ID (export for use in other files)
export const getDeviceId = getShortDeviceId;