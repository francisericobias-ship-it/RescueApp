// src/services/bleManagerService.ts
import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

// UUIDs for emergency service
const SERVICE_UUID = '12345678-1234-1234-1234-1234567890AB';
const CHARACTERISTIC_UUID = '12345678-1234-1234-1234-1234567890AC';

interface BLEDevice {
  id: string;
  name: string;
  rssi: number;
}

class BLEManagerService {
  private isInitialized = false;
  private isScanning = false;
  private isAdvertising = false;
  private connectedDevices: Map<string, boolean> = new Map();
  private onEmergencyCallback: ((message: string, deviceId: string) => void) | null = null;

  // Initialize BLE Manager
  async init(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await BleManager.start({ showAlert: false });
      
      // Set up event listeners
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', this.handleDiscoverPeripheral);
      bleManagerEmitter.addListener('BleManagerDidUpdateValueForCharacteristic', this.handleIncomingData);
      bleManagerEmitter.addListener('BleManagerConnectPeripheral', this.handleConnect);
      bleManagerEmitter.addListener('BleManagerDisconnectPeripheral', this.handleDisconnect);
      
      this.isInitialized = true;
      console.log('✅ BLE Manager initialized');
      return true;
    } catch (error) {
      console.log('❌ BLE init error:', error);
      return false;
    }
  }

  // Request permissions for Android 12+
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const permissions = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];
        
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const allGranted = Object.values(granted).every(
          g => g === PermissionsAndroid.RESULTS.GRANTED
        );
        
        console.log('Permissions granted:', allGranted);
        return allGranted;
      } catch (err) {
        console.log('Permission error:', err);
        return false;
      }
    }
    return true;
  }

  // Start BLE advertising (as GATT Server)
  async startAdvertising(): Promise<boolean> {
    if (!this.isInitialized) await this.init();
    if (this.isAdvertising) return true;

    try {
      await BleManager.startAdvertising({
        serviceUUIDs: [SERVICE_UUID],
        characteristicUUIDs: [CHARACTERISTIC_UUID],
        connectable: true,
      });
      
      this.isAdvertising = true;
      console.log('✅ Advertising started - Device is discoverable');
      return true;
    } catch (error) {
      console.log('❌ Advertising error:', error);
      return false;
    }
  }

  // Stop advertising
  async stopAdvertising(): Promise<void> {
    if (!this.isAdvertising) return;
    
    try {
      await BleManager.stopAdvertising();
      this.isAdvertising = false;
      console.log('🛑 Advertising stopped');
    } catch (error) {
      console.log('Stop advertising error:', error);
    }
  }

  // Start scanning for devices
  async startScan(callback?: (device: BLEDevice) => void): Promise<void> {
    if (!this.isInitialized) await this.init();
    if (this.isScanning) return;

    try {
      this.isScanning = true;
      await BleManager.scan([SERVICE_UUID], 10, true);
      console.log('🔍 Scanning started');
      
      // Temporary callback listener
      if (callback) {
        const listener = (device: any) => {
          callback({
            id: device.id,
            name: device.name || 'Unknown',
            rssi: device.rssi,
          });
        };
        bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', listener);
        
        // Remove after 10 seconds
        setTimeout(() => {
          bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', listener);
        }, 10000);
      }
    } catch (error) {
      console.log('Scan error:', error);
    }
  }

  // Stop scanning
  async stopScan(): Promise<void> {
    if (!this.isScanning) return;
    
    try {
      await BleManager.stopScan();
      this.isScanning = false;
      console.log('🛑 Scanning stopped');
    } catch (error) {
      console.log('Stop scan error:', error);
    }
  }

  // Connect to a device
  async connect(deviceId: string): Promise<boolean> {
    try {
      await BleManager.connect(deviceId);
      await BleManager.discoverServices(deviceId);
      this.connectedDevices.set(deviceId, true);
      console.log('✅ Connected to:', deviceId);
      return true;
    } catch (error) {
      console.log('❌ Connection error:', error);
      return false;
    }
  }

  // Disconnect from device
  async disconnect(deviceId: string): Promise<void> {
    try {
      await BleManager.disconnect(deviceId);
      this.connectedDevices.delete(deviceId);
      console.log('Disconnected from:', deviceId);
    } catch (error) {
      console.log('Disconnect error:', error);
    }
  }

  // Send emergency message
  async sendEmergency(deviceId: string, message: string): Promise<boolean> {
    try {
      // Split message into chunks (max 20 bytes)
      const chunks = this.chunkMessage(message);
      
      for (let i = 0; i < chunks.length; i++) {
        await BleManager.write(
          deviceId,
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          chunks[i]
        );
        await this.delay(100); // Small delay between chunks
      }
      
      console.log('✅ Emergency sent to:', deviceId);
      return true;
    } catch (error) {
      console.log('❌ Send error:', error);
      return false;
    }
  }

  // Set callback for incoming emergencies
  setEmergencyCallback(callback: (message: string, deviceId: string) => void): void {
    this.onEmergencyCallback = callback;
  }

  // Get nearby devices
  async getNearbyDevices(): Promise<BLEDevice[]> {
    return new Promise((resolve) => {
      const devices: BLEDevice[] = [];
      
      const listener = (device: any) => {
        devices.push({
          id: device.id,
          name: device.name || 'Unknown',
          rssi: device.rssi,
        });
      };
      
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', listener);
      
      this.startScan();
      
      setTimeout(() => {
        this.stopScan();
        bleManagerEmitter.removeListener('BleManagerDiscoverPeripheral', listener);
        resolve(devices);
      }, 10000);
    });
  }

  // Clean up
  async cleanup(): Promise<void> {
    await this.stopAdvertising();
    await this.stopScan();
    
    for (const deviceId of this.connectedDevices.keys()) {
      await this.disconnect(deviceId);
    }
    
    bleManagerEmitter.removeAllListeners('BleManagerDiscoverPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerDidUpdateValueForCharacteristic');
    bleManagerEmitter.removeAllListeners('BleManagerConnectPeripheral');
    bleManagerEmitter.removeAllListeners('BleManagerDisconnectPeripheral');
    
    this.isInitialized = false;
    console.log('🧹 BLE Manager cleaned up');
  }

  // Private helper methods
  private handleDiscoverPeripheral = (device: any) => {
    console.log('📱 Found device:', device.name || device.id);
  };

  private handleIncomingData = (data: any) => {
    if (data.characteristic === CHARACTERISTIC_UUID && data.value) {
      const message = this.decodeMessage(data.value);
      console.log('📥 Emergency received:', message);
      this.onEmergencyCallback?.(message, data.peripheral);
    }
  };

  private handleConnect = (data: any) => {
    console.log('🔗 Connected to:', data.peripheral);
  };

  private handleDisconnect = (data: any) => {
    console.log('🔌 Disconnected from:', data.peripheral);
    this.connectedDevices.delete(data.peripheral);
  };

  private chunkMessage(message: string): Uint8Array[] {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(message);
    const chunks: Uint8Array[] = [];
    const chunkSize = 20;
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      chunks.push(bytes.slice(i, i + chunkSize));
    }
    
    return chunks;
  }

  private decodeMessage(data: string): string {
    try {
      const decoder = new TextDecoder();
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      return decoder.decode(bytes);
    } catch {
      return data;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new BLEManagerService();