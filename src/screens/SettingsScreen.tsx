// SettingsScreen.tsx - Modern Emergency Healthcare Settings

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';

const STORAGE_KEYS = {
  notifications: '@settings_notifications',
  locationAlways: '@settings_location_always',
  crashSensitivity: '@settings_crash_sensitivity',
  sosAutoDial: '@settings_sos_auto_dial',
  emergencySounds: '@settings_emergency_sounds',
} as const;

type CrashSensitivity = 'low' | 'medium' | 'high';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [locationAlways, setLocationAlways] = useState<boolean>(false);
  const [crashSensitivity, setCrashSensitivity] = useState<CrashSensitivity>('medium');
  const [sosAutoDial, setSosAutoDial] = useState<boolean>(false);
  const [emergencySounds, setEmergencySounds] = useState<boolean>(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const results = await AsyncStorage.multiGet([
          STORAGE_KEYS.notifications,
          STORAGE_KEYS.locationAlways,
          STORAGE_KEYS.crashSensitivity,
          STORAGE_KEYS.sosAutoDial,
          STORAGE_KEYS.emergencySounds,
        ]);

        setNotificationsEnabled(results[0][1] !== 'false');
        setLocationAlways(results[1][1] === 'true');
        setCrashSensitivity((results[2][1] as CrashSensitivity) || 'medium');
        setSosAutoDial(results[3][1] === 'true');
        setEmergencySounds(results[4][1] !== 'false');
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    };

    loadSettings();
  }, []);

  const saveSetting = async (key: string, value: boolean | string) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (e) {
      console.warn('Failed to save setting', e);
      Alert.alert('Error', 'Failed to save setting');
    }
  };

  const showResetConfirm = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetToDefaults,
        },
      ]
    );
  };

  const resetToDefaults = async () => {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
      setNotificationsEnabled(true);
      setLocationAlways(false);
      setCrashSensitivity('medium');
      setSosAutoDial(false);
      setEmergencySounds(true);
      Alert.alert('Success', 'Settings have been reset to default');
    } catch (e) {
      Alert.alert('Error', 'Failed to reset settings');
    }
  };

  const handleLinkPress = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', `Cannot open URL: ${url}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Configure your emergency preferences</Text>
        </View>

        {/* Emergency Section - Most Important */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#FF3B30' }]}>
              <Icon name="alert-triangle" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>Emergency Settings</Text>
          </View>

          <SettingItem
            icon="phone"
            iconColor="#FF3B30"
            title="Auto-dial Emergency Services"
            description="Automatically call emergency services when SOS is triggered"
            value={sosAutoDial}
            onValueChange={(val) => {
              if (val) {
                Alert.alert(
                  'Auto-dial Emergency',
                  'This will automatically call emergency services when you trigger SOS. This feature requires phone permissions.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Enable',
                      onPress: () => {
                        setSosAutoDial(val);
                        saveSetting(STORAGE_KEYS.sosAutoDial, val);
                      },
                    },
                  ]
                );
              } else {
                setSosAutoDial(val);
                saveSetting(STORAGE_KEYS.sosAutoDial, val);
              }
            }}
            type="switch"
          />

          <SettingItem
            icon="volume-2"
            iconColor="#FF3B30"
            title="Emergency Sounds"
            description="Play alert sounds during emergency situations"
            value={emergencySounds}
            onValueChange={(val) => {
              setEmergencySounds(val);
              saveSetting(STORAGE_KEYS.emergencySounds, val);
            }}
            type="switch"
          />
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#007AFF' }]}>
              <Icon name="bell" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <SettingItem
            icon="bell"
            iconColor="#007AFF"
            title="Push Notifications"
            description="Receive crash detection & emergency alerts"
            value={notificationsEnabled}
            onValueChange={(val) => {
              setNotificationsEnabled(val);
              saveSetting(STORAGE_KEYS.notifications, val);
            }}
            type="switch"
          />
        </View>

        {/* Safety & Location Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#34C759' }]}>
              <Icon name="shield" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>Safety & Location</Text>
          </View>

          <SettingItem
            icon="map-pin"
            iconColor="#34C759"
            title="Background Location"
            description="Required for continuous safety monitoring and crash detection"
            value={locationAlways}
            onValueChange={(val) => {
              if (val && Platform.OS === 'android') {
                Alert.alert(
                  'Background Location Permission',
                  'This feature requires permission to access your location even when the app is not in use. This is essential for crash detection and emergency services.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Continue',
                      style: 'default',
                      onPress: () => {
                        setLocationAlways(true);
                        saveSetting(STORAGE_KEYS.locationAlways, true);
                      },
                    },
                  ]
                );
              } else {
                setLocationAlways(val);
                saveSetting(STORAGE_KEYS.locationAlways, val);
              }
            }}
            type="switch"
          />

          {/* Crash Sensitivity */}
          <View style={styles.sensitivitySection}>
            <View style={styles.sensitivityHeader}>
              <Icon name="activity" size={22} color="#34C759" style={styles.sensitivityIcon} />
              <View>
                <Text style={styles.sensitivityTitle}>Crash Detection Sensitivity</Text>
                <Text style={styles.sensitivityDescription}>
                  Adjust how sensitive crash detection should be
                </Text>
              </View>
            </View>

            <View style={styles.sensitivityOptions}>
              {(['low', 'medium', 'high'] as CrashSensitivity[]).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.sensitivityOption,
                    crashSensitivity === opt && styles.sensitivityOptionActive,
                  ]}
                  onPress={() => {
                    setCrashSensitivity(opt);
                    saveSetting(STORAGE_KEYS.crashSensitivity, opt);
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={
                      opt === 'low' ? 'bar-chart-2' : opt === 'medium' ? 'activity' : 'alert-triangle'
                    }
                    size={22}
                    color={crashSensitivity === opt ? '#FFFFFF' : '#8E8E93'}
                  />
                  <Text
                    style={[
                      styles.sensitivityOptionText,
                      crashSensitivity === opt && styles.sensitivityOptionTextActive,
                    ]}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                  {crashSensitivity === opt && (
                    <Icon name="check" size={14} color="#FFFFFF" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sensitivityInfo}>
              <Icon name="info" size={14} color="#8E8E93" />
              <Text style={styles.sensitivityInfoText}>
                {crashSensitivity === 'low'
                  ? 'Low sensitivity: Detects only major impacts (fewer false alarms)'
                  : crashSensitivity === 'medium'
                  ? 'Medium sensitivity: Balanced accuracy for most driving conditions'
                  : 'High sensitivity: Detects minor impacts (may trigger more alerts)'}
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: '#5856D6' }]}>
              <Icon name="info" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleLinkPress('https://rescuelink.com/privacy')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="lock" size={22} color="#5856D6" />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#C6C6C8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleLinkPress('https://rescuelink.com/terms')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="file-text" size={22} color="#5856D6" />
              <Text style={styles.menuItemText}>Terms of Service</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#C6C6C8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleLinkPress('mailto:support@rescuelink.com')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="mail" size={22} color="#5856D6" />
              <Text style={styles.menuItemText}>Contact Support</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#C6C6C8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.lastMenuItem]}
            onPress={() => handleLinkPress('https://rescuelink.com/help')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="help-circle" size={22} color="#5856D6" />
              <Text style={styles.menuItemText}>Help Center</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#C6C6C8" />
          </TouchableOpacity>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={styles.resetButton}
          onPress={showResetConfirm}
          activeOpacity={0.7}
        >
          <Icon name="refresh-ccw" size={20} color="#FF3B30" />
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>RescueLink v2.1.0</Text>
          <Text style={styles.footerSubtext}>Emergency Ready • 24/7 Protection</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Setting Item Component
interface SettingItemProps {
  icon: string;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  type: 'switch';
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor,
  title,
  description,
  value,
  onValueChange,
}) => (
  <View style={styles.settingItem}>
    <View style={[styles.settingIcon, { backgroundColor: iconColor + '15' }]}>
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#E5E5EA', true: iconColor }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#E5E5EA"
    />
  </View>
);

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  sensitivitySection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  sensitivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sensitivityIcon: {
    marginRight: 12,
  },
  sensitivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  sensitivityDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sensitivityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sensitivityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  sensitivityOptionActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
  },
  sensitivityOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 6,
  },
  sensitivityOptionTextActive: {
    color: '#FFFFFF',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  sensitivityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 12,
  },
  sensitivityInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
    lineHeight: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 14,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 10,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#C6C6C8',
    marginTop: 4,
  },
});