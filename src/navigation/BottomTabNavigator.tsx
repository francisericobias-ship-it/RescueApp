import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const AnimatedIcon = ({ name, focused }: any) => {
  const scale = new Animated.Value(focused ? 1.2 : 1);

  Animated.spring(scale, {
    toValue: focused ? 1.2 : 1,
    useNativeDriver: true,
  }).start();

  return (
    <Animated.View
      style={[
        styles.iconContainer,
        focused && styles.activeIcon,
        { transform: [{ scale }] },
      ]}
    >
      <Icon name={name} size={22} color={focused ? '#fff' : '#666'} />
    </Animated.View>
  );
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,

        tabBarIcon: ({ focused }) => {
          let iconName = '';

          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'History') iconName = 'clock';
          else if (route.name === 'Profile') iconName = 'user';
          else if (route.name === 'Settings') iconName = 'settings';

          return <AnimatedIcon name={iconName} focused={focused} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 25,
    backgroundColor: '#ffffffee', // glass effect
    borderTopWidth: 0,

    elevation: 20, // Android shadow
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeIcon: {
    backgroundColor: '#e74c3c',
  },
});