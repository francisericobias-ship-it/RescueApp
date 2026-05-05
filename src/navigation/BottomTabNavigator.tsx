// BottomTabNavigator.tsx - Modern Emergency Healthcare Navigation

import React, { useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
  Vibration,
  Text,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useNavigation, useRoute } from '@react-navigation/native';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BleBroadcastScreen from '../screens/BleBroadcastScreen';

export type TabParamList = {
  Home: undefined;
  History: undefined;
  BleBroadcast: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

/* ---------------- ANIMATED ICON WITH LABEL ---------------- */

const AnimatedIcon = ({ name, label, focused }: any) => {
  const scale = useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.1 : 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={[styles.iconContainer, { opacity, transform: [{ scale }] }]}>
      <Icon 
        name={name} 
        size={24} 
        color={focused ? '#FF3B30' : '#8E8E93'} 
      />
      <Text style={[styles.iconLabel, { color: focused ? '#FF3B30' : '#8E8E93' }]}>
        {label}
      </Text>
    </Animated.View>
  );
};

/* ---------------- MODERN EMERGENCY MIDDLE BUTTON ---------------- */

const EmergencyMiddleButton = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isActive = route.name === 'BleBroadcast';

  useEffect(() => {
    // Pulsing animation for emergency button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, []);

  const handlePress = () => {
    // Haptic feedback for emergency action
    if (Platform.OS === 'ios') {
      Vibration.vibrate([0, 100, 50, 100]); // Pattern: wait, vibrate, pause, vibrate
    } else {
      Vibration.vibrate(200);
    }
    
    navigation.navigate('BleBroadcast');
  };

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.middleButton,
        pressed && styles.middleButtonPressed,
        isActive && styles.middleButtonActive
      ]} 
      onPress={handlePress}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Icon name="radio" size={32} color="#FFFFFF" />
      </Animated.View>
      <View style={styles.middleButtonBadge}>
        <Text style={styles.middleButtonBadgeText}>Mesh</Text>
      </View>
    </Pressable>
  );
};

/* ---------------- MAIN NAVIGATOR ---------------- */

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarHideOnKeyboard: true,
        
        tabBarIcon: ({ focused }) => {
          let iconName = '';
          let label = '';

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              label = 'Home';
              break;
            case 'History':
              iconName = 'clock';
              label = 'History';
              break;
            case 'Profile':
              iconName = 'user';
              label = 'Profile';
              break;
            case 'Settings':
              iconName = 'settings';
              label = 'Settings';
              break;
            default:
              iconName = 'circle';
              label = '';
          }

          return <AnimatedIcon name={iconName} label={label} focused={focused} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarAccessibilityLabel: "Home",
        }}
      />

      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarAccessibilityLabel: "Emergency History",
        }}
      />

      {/* Emergency Mesh Network Button */}
      <Tab.Screen
        name="BleBroadcast"
        component={BleBroadcastScreen} // Will be replaced with actual BLE screen
        options={{
          tabBarButton: () => <EmergencyMiddleButton />,
          tabBarAccessibilityLabel: "Emergency Mesh Network",
        }}
      />

      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: "Medical Profile",
        }}
      />

      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{
          tabBarAccessibilityLabel: "App Settings",
        }}
      />
    </Tab.Navigator>
  );
}

/* ---------------- MODERN STYLES ---------------- */

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 20,
    left: 20,
    right: 20,
    height: Platform.OS === 'ios' ? 75 : 70,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopWidth: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    
    // Modern shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 15,
    
    // Glass morphism effect (optional)
    ...(Platform.OS === 'ios' && {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    }),
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 60,
  },

  iconLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.3,
  },

  /* 🔥 Emergency Mesh Button - Modern Redesign */
  middleButton: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    
    width: 70,
    height: 70,
    borderRadius: 35,
    
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    
    // Strong shadow for depth
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    
    // Subtle border
    borderWidth: 3,
    borderColor: '#FFFFFF',
    
    // Press feedback
    transform: [{ scale: 1 }],
  },

  middleButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: '#D70015',
    shadowOpacity: 0.2,
  },

  middleButtonActive: {
    backgroundColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },

  middleButtonBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  middleButtonBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// Optional: Add animation for route changes
export const tabNavigatorOptions = {
  animation: 'shift',
  tabBarActiveTintColor: '#FF3B30',
  tabBarInactiveTintColor: '#8E8E93',
};