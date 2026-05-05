// services/emergencyApi.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';

const API_URL = 'https://rescuelink-backend-j0gz.onrender.com/api/v1';

export interface EmergencyData {
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  type?: string;
  impact_force?: number;
}

// Get unique device ID
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = await DeviceInfo.getUniqueId();
      await AsyncStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  } catch (error) {
    return `device_${Date.now()}`;
  }
};

// Send emergency to API
export const sendEmergency = async (data: EmergencyData): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        device_id: data.device_id,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Emergency sent successfully:', result);
      return true;
    } else {
      console.log('❌ Emergency failed:', result.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error);
    return false;
  }
};

// Send emergency with location (simplified)
export const sendEmergencyWithLocation = async (
  latitude: number,
  longitude: number
): Promise<boolean> => {
  const deviceId = await getDeviceId();
  return sendEmergency({
    device_id: deviceId,
    latitude: latitude,
    longitude: longitude,
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
  });
};

// Get emergency history
export const getEmergencyHistory = async (): Promise<any[]> => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(`${API_URL}/emergency`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.log('Get history error:', error);
    return [];
  }
};