// src/native/BLEAdvertiser.ts

import { NativeModules, Platform, Alert, Linking } from 'react-native';

const { BLEAdvertiser } = NativeModules;

export interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
  data?: string;
}

// Check if Bluetooth is enabled
export const isBluetoothEnabled = async (): Promise<boolean> => {
  try {
    // You can also check via BleManager
    return true;
  } catch {
    return false;
  }
};

// Start BLE advertising
export const startAdvertising = async (data: string = ''): Promise<boolean> => {
  if (!BLEAdvertiser) {
    console.log('❌ BLEAdvertiser module not available');
    Alert.alert('Error', 'BLE module not available');
    return false;
  }
  
  try {
    const result = await BLEAdvertiser.startAdvertising(data);
    console.log('✅ Advertising started:', result);
    return true;
  } catch (error: any) {
    console.log('❌ Advertising error:', error);
    
    if (error.code === 'BLUETOOTH_OFF') {
      Alert.alert(
        'Bluetooth Required',
        'Please turn on Bluetooth to make your device discoverable.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    } else if (error.code === 'NOT_SUPPORTED') {
      Alert.alert('Not Supported', 'Your device does not support BLE advertising.');
    } else {
      Alert.alert('Advertising Failed', error.message || 'Could not start advertising');
    }
    
    return false;
  }
};

// Stop BLE advertising
export const stopAdvertising = async (): Promise<void> => {
  if (!BLEAdvertiser) return;
  try {
    await BLEAdvertiser.stopAdvertising();
    console.log('✅ Advertising stopped');
  } catch (error) {
    console.log('Stop error:', error);
  }
};

// Check if currently advertising
export const isAdvertising = async (): Promise<boolean> => {
  if (!BLEAdvertiser) return false;
  try {
    return await BLEAdvertiser.isAdvertising();
  } catch {
    return false;
  }
};

// Start scanning for devices
export const startScanning = async (): Promise<BLEDevice[]> => {
  if (!BLEAdvertiser) {
    console.log('❌ BLEAdvertiser module not available');
    return [];
  }
  
  try {
    const devices = await BLEAdvertiser.startScanning();
    console.log('✅ Scanning completed, devices found:', devices?.length || 0);
    
    const formattedDevices: BLEDevice[] = (devices || []).map((device: any) => ({
      id: device.id,
      name: device.name,
      rssi: device.rssi,
      data: device.data,
    }));
    
    return formattedDevices;
  } catch (error) {
    console.log('❌ Scan error:', error);
    return [];
  }
};

// Stop scanning
export const stopScanning = async (): Promise<void> => {
  if (!BLEAdvertiser) return;
  try {
    await BLEAdvertiser.stopScanning();
    console.log('✅ Scanning stopped');
  } catch (error) {
    console.log('Stop scan error:', error);
  }
};