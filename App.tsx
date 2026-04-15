import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from './src/services/NavigationService';

// 🔥 SOCKET + HISTORY
import socket from './src/services/socketService';
import { saveHistoryEvent } from './src/services/historyStorage';

type InitialRouteType = 'Onboarding' | 'Login' | 'MainTabs';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<InitialRouteType>('Login');

  // 🔥 USER ID
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // 🔥 prevent duplicate crash trigger
  const crashHandledRef = useRef(false);

  // 🔥 prevent duplicate socket event
  const lastHandledId = useRef<string | null>(null);

  (global as any).navigationRef = navigationRef;

  /* ---------------- CHECK INITIAL ROUTE ---------------- */
  useEffect(() => {
    const checkAppState = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('onboarded');
        const token = await AsyncStorage.getItem('token');

        // 🔥 GET USER ID
        const userId = await AsyncStorage.getItem('user_id');
        if (userId) {
          setCurrentUserId(parseInt(userId));
        }

        if (!onboarded) {
          setInitialRoute('Onboarding');
        } else if (token) {
          setInitialRoute('MainTabs');
        } else {
          setInitialRoute('Login');
        }
      } catch (e) {
        console.log('Error reading storage:', e);
        setInitialRoute('Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAppState();
  }, []);

  /* ---------------- HANDLE CRASH OVERLAY ---------------- */
  useEffect(() => {
    const checkCrashTrigger = async () => {
      try {
        const crashFlag = await AsyncStorage.getItem('OPEN_CRASH');

        if (crashFlag === 'true' && !crashHandledRef.current) {
          crashHandledRef.current = true;

          await AsyncStorage.removeItem('OPEN_CRASH');

          const navigateToCrash = () => {
            if (navigationRef.isReady()) {
              navigationRef.reset({
                index: 0,
                routes: [
                  {
                    name: 'CrashDetectionScreen',
                    params: { impactForce: 3.5 },
                  },
                ],
              });
            } else {
              setTimeout(navigateToCrash, 300);
            }
          };

          setTimeout(navigateToCrash, 500);
        }
      } catch (e) {
        console.log('Crash trigger error:', e);
      }
    };

    checkCrashTrigger();
  }, []);

  /* ---------------- SOCKET CONNECTION ---------------- */
  useEffect(() => {
    socket.on('connect', () => {
      console.log('✅ SOCKET CONNECTED:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ SOCKET DISCONNECTED');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  /* ---------------- SOCKET LISTENER (ADMIN ACCEPTED) ---------------- */
  useEffect(() => {
    if (!currentUserId) return;

    const handler = async (data: any) => {
      console.log('📡 SOCKET RECEIVED:', data);

      if (!data?.id) return;

      // 🔥 prevent duplicate events
      if (lastHandledId.current === data.id) return;
      lastHandledId.current = data.id;

      // 🔥 only for current user
      if (data.user_id === currentUserId) {
        await saveHistoryEvent({
          id: Date.now().toString(),
          type: 'ADMIN_ACCEPTED',
          description: 'Responder has been assigned 🚑',
          timestamp: Date.now(),
        });

        console.log('✅ History updated');
      }
    };

    socket.on('alert:assigned', handler);

    return () => {
      socket.off('alert:assigned', handler);
    };
  }, [currentUserId]);

  /* ---------------- LOADING ---------------- */
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  return <AppNavigator initialRouteName={initialRoute} />;
}