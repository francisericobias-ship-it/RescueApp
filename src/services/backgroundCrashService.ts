// backgroundCrashService.ts - Improved Background Crash Detection

import BackgroundService from 'react-native-background-actions';
import { Platform, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestLocationPermission } from '../utils/LocationPermissions';

let triggerTime: number | null = null;
let alreadySent = false;
let crashCountdownInterval: NodeJS.Timeout | null = null;
let currentImpactForce = 0;

const sleep = (time: number) => new Promise(resolve => setTimeout(resolve, time));

/* ---------------- TYPES ---------------- */
interface CrashTaskData {
  delay: number;
  impactForce: number;
  onSendSOS: () => Promise<void>;
  onUpdateStatus?: (status: string) => void;
}

interface BackgroundCrashData {
  latitude: number;
  longitude: number;
  impactForce: number;
  timestamp: number;
  severity: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
}

/* ---------------- GET LOCATION ---------------- */
const getLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }),
      (error) => {
        console.log('Location error in background:', error);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

/* ---------------- SAVE TO STORAGE ---------------- */
const saveCrashEvent = async (data: BackgroundCrashData) => {
  try {
    const history = await AsyncStorage.getItem('crash_history');
    const events = history ? JSON.parse(history) : [];
    events.unshift({
      ...data,
      id: `${Date.now()}`,
      source: 'background_service',
    });
    
    // Keep only last 50 events
    const trimmedEvents = events.slice(0, 50);
    await AsyncStorage.setItem('crash_history', JSON.stringify(trimmedEvents));
  } catch (error) {
    console.log('Failed to save crash event:', error);
  }
};

/* ---------------- SEND SOS WITH RETRY ---------------- */
const sendSOSWithRetry = async (
  onSendSOS: () => Promise<void>,
  retries: number = 3,
  delay: number = 2000
): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      await onSendSOS();
      console.log('✅ SOS sent successfully on attempt', i + 1);
      return true;
    } catch (error) {
      console.log(`❌ SOS attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        await sleep(delay);
      }
    }
  }
  return false;
};

/* ---------------- SHOW LOCAL NOTIFICATION ---------------- */
const showLocalNotification = async (title: string, message: string) => {
  try {
    // You can integrate react-native-push-notification here
    console.log('🔔 NOTIFICATION:', title, message);
    // PushNotification.localNotification({ title, message });
  } catch (error) {
    console.log('Notification error:', error);
  }
};

/* ---------------- CRASH SEVERITY CALCULATION ---------------- */
const getCrashSeverity = (impactForce: number): 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL' => {
  if (impactForce >= 5) return 'CRITICAL';
  if (impactForce >= 3.5) return 'SEVERE';
  if (impactForce >= 2.5) return 'MODERATE';
  return 'LOW';
};

/* 🔥 MAIN BACKGROUND TASK - IMPROVED */
const crashTask = async (taskData: any) => {
  const { delay, impactForce, onSendSOS, onUpdateStatus } = taskData as CrashTaskData;
  
  // Reset states
  triggerTime = Date.now() + delay;
  alreadySent = false;
  currentImpactForce = impactForce;
  
  console.log("🚀 Background crash monitoring started");
  console.log(`⏰ Auto-report in ${delay / 1000} seconds`);
  console.log(`💥 Impact force: ${impactForce}G`);
  
  // Show notification that monitoring started
  await showLocalNotification(
    'Crash Detection Active',
    `Monitoring for ${delay / 1000} seconds. Tap to cancel if you're okay.`
  );
  
  // Countdown timer for UI updates
  let lastRemaining = delay / 1000;
  
  while (BackgroundService.isRunning()) {
    if (triggerTime && !alreadySent) {
      const remaining = Math.max(0, Math.ceil((triggerTime - Date.now()) / 1000));
      
      // Update status every second
      if (remaining !== lastRemaining && onUpdateStatus) {
        onUpdateStatus(`${remaining} seconds until auto-report...`);
        lastRemaining = remaining;
      }
      
      // Trigger SOS when countdown reaches zero
      if (Date.now() >= triggerTime) {
        console.log("🚨 AUTO SOS TRIGGERED (BACKGROUND)");
        
        alreadySent = true;
        
        // Get location before sending
        const location = await getLocation();
        
        // Save crash event locally
        await saveCrashEvent({
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          impactForce: currentImpactForce,
          timestamp: Date.now(),
          severity: getCrashSeverity(currentImpactForce),
        });
        
        // Send SOS with retry
        const success = await sendSOSWithRetry(onSendSOS, 3, 2000);
        
        if (success) {
          console.log("✅ Emergency services notified from background");
          await showLocalNotification(
            'Emergency Services Notified',
            'Your location has been sent to emergency responders.'
          );
        } else {
          console.log("❌ Failed to send SOS after all retries");
          await showLocalNotification(
            'SOS Failed',
            'Unable to send emergency alert. Please check your connection.'
          );
        }
        
        // Stop background service after SOS is sent
        await BackgroundService.stop();
        break;
      }
    }
    
    await sleep(1000);
  }
  
  console.log("🛑 Background crash monitoring stopped");
};

/* 🔥 START SERVICE - IMPROVED */
export const startCrashService = async (
  onSendSOS: () => Promise<void>,
  impactForce: number = 3,
  delay: number = 10000,
  onUpdateStatus?: (status: string) => void
): Promise<boolean> => {
  try {
    // Check if service is already running
    const isRunning = await BackgroundService.isRunning();
    if (isRunning) {
      console.log("⚠️ Background service already running");
      await stopCrashService();
    }
    
    // Request location permission if not granted
    const hasLocationPermission = await requestLocationPermission();
    if (!hasLocationPermission) {
      console.log("❌ Location permission denied");
      if (Platform.OS === 'android') {
        // Still continue but location will be missing
      }
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
      linkingURI: 'rescuelink://crash', // Deep link to open app
      parameters: {
        delay,
        impactForce,
        onSendSOS,
        onUpdateStatus,
      },
    };
    
    await BackgroundService.start(crashTask, options);
    console.log("✅ Background crash service started");
    return true;
    
  } catch (error) {
    console.log("Failed to start background service:", error);
    return false;
  }
};

/* 🔥 STOP SERVICE - IMPROVED */
export const stopCrashService = async (): Promise<boolean> => {
  try {
    const isRunning = await BackgroundService.isRunning();
    if (isRunning) {
      await BackgroundService.stop();
      console.log("✅ Background crash service stopped");
    }
    
    // Reset states
    triggerTime = null;
    alreadySent = false;
    currentImpactForce = 0;
    
    if (crashCountdownInterval) {
      clearInterval(crashCountdownInterval);
      crashCountdownInterval = null;
    }
    
    return true;
  } catch (error) {
    console.log("Failed to stop background service:", error);
    return false;
  }
};

/* 🔥 UPDATE CRASH TIMER - NEW */
export const updateCrashTimer = async (newDelay: number): Promise<boolean> => {
  try {
    const isRunning = await BackgroundService.isRunning();
    if (!isRunning) {
      console.log("⚠️ No active crash service to update");
      return false;
    }
    
    triggerTime = Date.now() + newDelay;
    alreadySent = false;
    console.log(`⏰ Timer updated: ${newDelay / 1000} seconds remaining`);
    return true;
    
  } catch (error) {
    console.log("Failed to update timer:", error);
    return false;
  }
};

/* 🔥 GET SERVICE STATUS - NEW */
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

/* 🔥 CANCEL CRASH COUNTDOWN - NEW */
export const cancelCrashCountdown = async (): Promise<boolean> => {
  try {
    if (triggerTime && !alreadySent) {
      alreadySent = true;
      triggerTime = null;
      console.log("✅ Crash countdown cancelled by user");
      
      await showLocalNotification(
        'Crash Alert Cancelled',
        'You have cancelled the emergency alert. Stay safe!'
      );
      
      // Stop service after cancellation
      await stopCrashService();
      return true;
    }
    return false;
  } catch (error) {
    console.log("Failed to cancel countdown:", error);
    return false;
  }
};

/* 🔥 TEST BACKGROUND SERVICE - NEW */
export const testBackgroundService = async (): Promise<boolean> => {
  console.log("🧪 Testing background service...");
  
  const testSOS = async () => {
    console.log("✅ Test SOS triggered");
    return Promise.resolve();
  };
  
  const started = await startCrashService(testSOS, 2, 5000);
  
  if (started) {
    console.log("⏰ Test service will trigger in 5 seconds");
    
    // Auto-stop after 6 seconds
    setTimeout(async () => {
      await stopCrashService();
      console.log("🧪 Test completed");
    }, 6000);
    
    return true;
  }
  
  return false;
};