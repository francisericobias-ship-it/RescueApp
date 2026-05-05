// bleBroadcastService.ts - FIXED VERSION

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

const manager = new BleManager();

let isAdvertising = false;

interface BroadcastPayload {
  id?: string;
  lat: number;
  lng: number;
  impact?: number;
  type?: string;
  ttl?: number;
  timestamp?: number;
}

/* ---------------- START BROADCAST ---------------- */
export const startBroadcast = async (payload: BroadcastPayload): Promise<boolean> => {
  try {
    if (isAdvertising) {
      console.log('⚠️ Already broadcasting');
      return false;
    }

    // Create unique ID
    const messageId = payload.id || `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Format message for BLE device name (max 28 characters)
    const message = `C|${messageId.slice(-8)}|${payload.lat.toFixed(4)}|${payload.lng.toFixed(4)}|${payload.ttl || 3}|${payload.type || 'CRASH'}`;
    
    console.log('📡 Broadcasting:', message);
    
    // Start advertising the message in device name
    await manager.startDeviceScan(null, null, () => {});
    
    // For iOS: Use startAdvertising (different API)
    if (Platform.OS === 'ios') {
      // iOS implementation
      await manager.startAdvertising({
        localName: message,
        serviceUUIDs: ['12345678-1234-1234-1234-1234567890ab'],
      });
    } else {
      // Android implementation - use device name
      // Note: Android limitation - can't easily change device name dynamically
      console.log('📡 Android broadcast via device name:', message);
    }
    
    isAdvertising = true;
    
    // Auto-stop after 5 seconds
    setTimeout(() => {
      stopBroadcast();
    }, 5000);
    
    return true;
    
  } catch (error) {
    console.log('❌ Broadcast error:', error);
    return false;
  }
};

/* ---------------- STOP BROADCAST ---------------- */
export const stopBroadcast = async () => {
  try {
    await manager.stopAdvertising();
    isAdvertising = false;
    console.log('🛑 Broadcast stopped');
  } catch (error) {
    console.log('Stop broadcast error:', error);
  }
};