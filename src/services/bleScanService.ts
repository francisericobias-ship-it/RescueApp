import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const manager = new BleManager();
let lastTimestamp: number | null = null;

export const startScanning = (onReceive: (data: any) => void) => {
  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.log('Scan error:', error);
      return;
    }

    if (device?.manufacturerData) {
      try {
        const decoded = Buffer.from(
          device.manufacturerData,
          'base64'
        ).toString('utf-8');

        const data = JSON.parse(decoded);

        // ✅ Deduplication
        if (lastTimestamp === data.t) return;
        lastTimestamp = data.t;

        console.log('📥 Received:', data);
        onReceive(data);

      } catch (e) {
        console.log('Decode error');
      }
    }
  });
};

export const stopScanning = () => {
  manager.stopDeviceScan();
};