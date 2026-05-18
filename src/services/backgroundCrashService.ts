// backgroundCrashService.ts - FIXED with better location handling

import BackgroundService from 'react-native-background-actions';
import { Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '../utils/LocationPermissions';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';

let triggerTime: number | null = null;
let alreadySent = false;
let currentImpactForce = 0;

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

/* ---------------- TYPES ---------------- */
interface CrashTaskData {
  delay: number;
  impactForce: number;
}

/* ---------------- GET LOCATION WITH RETRY ---------------- */
const getLocationWithRetry = async (maxRetries: number = 3): Promise<{ latitude: number; longitude: number } | null> => {
  for (let i = 0; i < maxRetries; i++) {
    console.log(`📍 Getting location attempt ${i + 1}...`);
    
    try {
      const location = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
        Geolocation.getCurrentPosition(
          (pos) => {
            console.log(`✅ Location obtained: ${pos.coords.latitude}, ${pos.coords.longitude}`);
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });
          },
          (error) => {
            console.log(`Location error attempt ${i + 1}:`, error.message);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
      
      if (location && location.latitude !== 0 && location.longitude !== 0) {
        return location;
      }
      
      if (i < maxRetries - 1) {
        console.log(`⏳ Retrying location in 2 seconds...`);
        await sleep(2000);
      }
    } catch (error) {
      console.log(`Location attempt ${i + 1} failed:`, error);
    }
  }
  
  console.log('❌ Failed to get location after all retries');
  return null;
};

/* ---------------- GET LAST KNOWN LOCATION ---------------- */
const getLastKnownLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const lastLocation = await AsyncStorage.getItem('last_known_location');
    if (lastLocation) {
      const location = JSON.parse(lastLocation);
      console.log(`📍 Using last known location: ${location.latitude}, ${location.longitude}`);
      return location;
    }
  } catch (error) {
    console.log('Failed to get last known location:', error);
  }
  return null;
};

/* ---------------- SAVE LAST KNOWN LOCATION ---------------- */
const saveLastKnownLocation = async (lat: number, lng: number) => {
  try {
    await AsyncStorage.setItem('last_known_location', JSON.stringify({ latitude: lat, longitude: lng }));
  } catch (error) {
    console.log('Failed to save last known location:', error);
  }
};

/* ---------------- SAVE TO STORAGE ---------------- */
const saveCrashEvent = async (lat: number, lng: number, impactForce: number, severity: string) => {
  try {
    const history = await AsyncStorage.getItem('crash_history');
    const events = history ? JSON.parse(history) : [];
    events.unshift({
      latitude: lat,
      longitude: lng,
      impactForce: impactForce,
      timestamp: Date.now(),
      severity: severity,
      source: 'background_service',
      id: `${Date.now()}`,
    });
    
    const trimmedEvents = events.slice(0, 50);
    await AsyncStorage.setItem('crash_history', JSON.stringify(trimmedEvents));
    console.log('✅ Crash saved locally');
  } catch (error) {
    console.log('Failed to save crash event:', error);
  }
};

/* ---------------- SEND TO BACKEND ---------------- */
const sendCrashToBackend = async (lat: number, lng: number, impactForce: number, severity: string): Promise<boolean> => {
  try {
    console.log('📡 Attempting to send crash to backend...');
    console.log(`📍 Location: ${lat}, ${lng}`);
    console.log(`💥 Impact: ${impactForce}G`);
    
    if (lat === 0 && lng === 0) {
      console.log('⚠️ Location is (0,0), trying to get last known location...');
      const lastLocation = await getLastKnownLocation();
      if (lastLocation) {
        lat = lastLocation.latitude;
        lng = lastLocation.longitude;
        console.log(`📍 Using last known location: ${lat}, ${lng}`);
      } else {
        console.log('❌ No valid location available');
        return false;
      }
    }
    
    const token = await AsyncStorage.getItem('token');
    console.log(`🔑 Token exists: ${!!token}`);
    
    const deviceId = await DeviceInfo.getUniqueId();
    const packetId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const crashData = {
      event_type: 'auto_crash',
      latitude: lat,
      longitude: lng,
      impact_force: impactForce,
      severity: severity.toLowerCase(),
      device_id: deviceId,
      source: 'background_service',
      packet_id: packetId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      movement_detected: true,
    };
    
    console.log('📦 Sending crash data...');
    
    const response = await fetch('https://rescuelink-backend-j0gz.onrender.com/api/v1/crash', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(crashData),
    });
    
    console.log(`📡 Response status: ${response.status}`);
    
    const result = await response.json();
    console.log('📡 Response body:', result);
    
    if (response.ok) {
      console.log('✅✅✅ Crash successfully sent to admin! ✅✅✅');
      return true;
    } else {
      console.log('❌ Server returned error:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Send to backend error:', error);
    return false;
  }
};

/* ---------------- SHOW LOCAL NOTIFICATION ---------------- */
const showLocalNotification = async (title: string, message: string) => {
  try {
    console.log(`🔔 NOTIFICATION: ${title} - ${message}`);
  } catch (error) {
    console.log('Notification error:', error);
  }
};

/* ---------------- CRASH SEVERITY CALCULATION ---------------- */
const getCrashSeverity = (impactForce: number): string => {
  if (impactForce >= 5) return 'CRITICAL';
  if (impactForce >= 3.5) return 'SEVERE';
  if (impactForce >= 2.5) return 'MODERATE';
  return 'LOW';
};

/* ---------------- CHECK INTERNET ---------------- */
const checkInternet = async (): Promise<boolean> => {
  const netInfo = await NetInfo.fetch();
  console.log(`🌐 Internet connected: ${netInfo.isConnected}`);
  return netInfo.isConnected ?? false;
};

/* ---------------- UPDATE LAST KNOWN LOCATION IN BACKGROUND ---------------- */
const updateLastKnownLocation = async () => {
  const location = await getLocationWithRetry(2);
  if (location) {
    await saveLastKnownLocation(location.latitude, location.longitude);
  }
};

/* 🔥 MAIN BACKGROUND TASK */
const crashTask = async (taskData: any) => {
  const { delay, impactForce } = taskData as CrashTaskData;
  
  console.log('========== BACKGROUND CRASH TASK STARTED ==========');
  
  triggerTime = Date.now() + delay;
  alreadySent = false;
  currentImpactForce = impactForce;
  
  console.log(`⏰ Auto-report in ${delay / 1000} seconds`);
  console.log(`💥 Impact force: ${impactForce}G`);
  
  // Try to update last known location
  await updateLastKnownLocation();
  
  await showLocalNotification(
    'Crash Detection Active',
    `Auto-report in ${delay / 1000} seconds`
  );
  
  while (BackgroundService.isRunning()) {
    if (triggerTime && !alreadySent) {
      if (Date.now() >= triggerTime) {
        console.log('🚨🚨🚨 COUNTDOWN REACHED ZERO! SENDING CRASH... 🚨🚨🚨');
        
        alreadySent = true;
        
        // Get location with retry
        console.log('📍 Getting location...');
        let location = await getLocationWithRetry(3);
        
        let lat = location?.latitude ?? 0;
        let lng = location?.longitude ?? 0;
        
        // If still no location, use last known location
        if (lat === 0 && lng === 0) {
          console.log('⚠️ No current location, trying last known location...');
          const lastLocation = await getLastKnownLocation();
          if (lastLocation) {
            lat = lastLocation.latitude;
            lng = lastLocation.longitude;
            console.log(`📍 Using last known location: ${lat}, ${lng}`);
          }
        }
        
        const severity = getCrashSeverity(impactForce);
        console.log(`📍 Final location: ${lat}, ${lng}`);
        console.log(`⚠️ Severity: ${severity}`);
        
        // Save locally first
        await saveCrashEvent(lat, lng, currentImpactForce, severity);
        
        // Check internet and send to backend
        const hasInternet = await checkInternet();
        
        if (hasInternet && lat !== 0 && lng !== 0) {
          console.log('🌐 Internet available, sending to backend...');
          const success = await sendCrashToBackend(lat, lng, currentImpactForce, severity);
          
          if (success) {
            console.log('✅✅✅ CRASH SUCCESSFULLY SENT TO ADMIN! ✅✅✅');
            await showLocalNotification(
              'Emergency Alert Sent',
              'Crash report has been sent to emergency services.'
            );
          } else {
            console.log('❌ Failed to send crash to admin');
            await showLocalNotification(
              'SOS Failed',
              'Unable to send crash report. Please check your connection.'
            );
          }
        } else if (!hasInternet) {
          console.log('🌐 No internet connection. Crash saved locally.');
          await showLocalNotification(
            'No Internet Connection',
            'Crash saved locally. Will send when online.'
          );
        } else if (lat === 0 && lng === 0) {
          console.log('📍 No location available. Crash saved without location.');
          await showLocalNotification(
            'Location Unavailable',
            'Crash detected but location could not be determined.'
          );
        }
        
        console.log('========== BACKGROUND CRASH TASK COMPLETED ==========');
        await BackgroundService.stop();
        break;
      }
    }
    
    await sleep(1000);
  }
  
  console.log('🛑 Background crash monitoring stopped');
};

/* 🔥 START SERVICE */
export const startCrashService = async (
  impactForce: number = 3,
  delay: number = 10000
): Promise<boolean> => {
  try {
    console.log('🔵 Starting background crash service...');
    
    const isRunning = await BackgroundService.isRunning();
    if (isRunning) {
      console.log("⚠️ Background service already running, stopping first...");
      await stopCrashService();
    }
    
    const hasLocationPermission = await requestLocationPermission();
    if (!hasLocationPermission) {
      console.log("❌ Location permission denied");
    }
    
    const options = {
      taskName: 'RescueLinkCrashDetection',
      taskTitle: '🚨 RescueLink - Crash Detection Active',
      taskDesc: `Auto-report in ${delay / 1000} seconds if you don't cancel`,
      taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
      },
      color: '#FF3B30',
      linkingURI: 'rescuelink://crash',
      parameters: {
        delay,
        impactForce,
      },
    };
    
    await BackgroundService.start(crashTask, options);
    console.log("✅ Background crash service started successfully");
    return true;
    
  } catch (error) {
    console.log("❌ Failed to start background service:", error);
    return false;
  }
};

/* 🔥 STOP SERVICE */
export const stopCrashService = async (): Promise<boolean> => {
  try {
    const isRunning = await BackgroundService.isRunning();
    if (isRunning) {
      await BackgroundService.stop();
      console.log("✅ Background crash service stopped");
    }
    
    triggerTime = null;
    alreadySent = false;
    currentImpactForce = 0;
    
    return true;
  } catch (error) {
    console.log("Failed to stop background service:", error);
    return false;
  }
};

/* 🔥 CANCEL CRASH COUNTDOWN */
export const cancelCrashCountdown = async (): Promise<boolean> => {
  try {
    if (triggerTime && !alreadySent) {
      alreadySent = true;
      triggerTime = null;
      console.log("✅ Crash countdown cancelled by user");
      await stopCrashService();
      return true;
    }
    return false;
  } catch (error) {
    console.log("Failed to cancel countdown:", error);
    return false;
  }
};

/* 🔥 GET SERVICE STATUS */
export const getCrashServiceStatus = async (): Promise<{
  isRunning: boolean;
  remainingSeconds: number | null;
  impactForce: number;
}> => {
  const isRunning = await BackgroundService.isRunning();
  const remainingSeconds = triggerTime ? Math.max(0, Math.ceil((triggerTime - Date.now()) / 1000)) : null;
  
  return {
    isRunning,
    remainingSeconds,
    impactForce: currentImpactForce,
  };
};