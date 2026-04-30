import { NativeModules } from 'react-native';
import { Buffer } from 'buffer';

const { BleAdvertiser } = NativeModules;

export const startBroadcast = () => {
  const payload = JSON.stringify({
    id: 'd1',
    lat: 14.12,
    lng: 122.95,
    t: Date.now(),
  });

  const base64Data = Buffer.from(payload).toString('base64');

  try {
    BleAdvertiser.startAdvertising({
      serviceUUID: '12345678-1234-1234-1234-1234567890ab',
      manufacturerData: base64Data,
    });

    console.log('📡 Broadcasting:', payload);
  } catch (e) {
    console.log('❌ Broadcast error:', e);
  }
};