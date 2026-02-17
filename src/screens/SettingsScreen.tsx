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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Correct import
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';

const STORAGE_KEYS = {
  notifications: '@settings_notifications',
  locationAlways: '@settings_location_always',
  crashSensitivity: '@settings_crash_sensitivity',
} as const;

type CrashSensitivity = 'low' | 'medium' | 'high';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [locationAlways, setLocationAlways] = useState<boolean>(false);
  const [crashSensitivity, setCrashSensitivity] =
    useState<CrashSensitivity>('medium');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const results = await AsyncStorage.multiGet([
          STORAGE_KEYS.notifications,
          STORAGE_KEYS.locationAlways,
          STORAGE_KEYS.crashSensitivity,
        ]);

        setNotificationsEnabled(results[0][1] !== 'false');
        setLocationAlways(results[1][1] === 'true');
        setCrashSensitivity(
          (results[2][1] as CrashSensitivity) || 'medium',
        );
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
      Alert.alert('Success', 'Settings have been reset to default');
    } catch (e) {
      Alert.alert('Error', 'Failed to reset settings');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View style={styles.background}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* ===== HEADER ===== */}
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
          </View>

          {/* ===== GENERAL SECTION ===== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#667EEA' }]}>
                <Icon name="settings" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>General</Text>
            </View>

            <SettingItem
              icon="bell"
              iconColor="#667EEA"
              title="Push Notifications"
              description="Crash detection & emergency alerts"
              value={notificationsEnabled}
              onValueChange={(val) => {
                setNotificationsEnabled(val);
                saveSetting(STORAGE_KEYS.notifications, val);
              }}
              type="switch"
            />
          </View>

          {/* ===== SAFETY SECTION ===== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#FF6B6B' }]}>
                <Icon name="shield" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>Safety & Location</Text>
            </View>

            <SettingItem
              icon="map-pin"
              iconColor="#FF6B6B"
              title="Background Location"
              description="Required for continuous safety monitoring"
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
                    ],
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
                <Icon name="activity" size={22} color="#FF6B6B" style={styles.sensitivityIcon} />
                <View>
                  <Text style={styles.sensitivityTitle}>Crash Sensitivity</Text>
                  <Text style={styles.sensitivityDescription}>
                    Adjust detection sensitivity level
                  </Text>
                </View>
              </View>

              <View style={styles.sensitivityOptions}>
                {(['low', 'medium', 'high'] as CrashSensitivity[]).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setCrashSensitivity(opt);
                      saveSetting(STORAGE_KEYS.crashSensitivity, opt);
                    }}
                  >
                    <View
                      style={[
                        styles.sensitivityOption,
                        crashSensitivity === opt && [styles.sensitivityOptionActive, { backgroundColor: '#FF6B6B' }],
                      ]}
                    >
                      <Icon
                        name={
                          opt === 'low' ? 'bar-chart' :
                          opt === 'medium' ? 'activity' : 'alert-triangle'
                        }
                        size={20}
                        color={crashSensitivity === opt ? '#FFFFFF' : '#64748B'}
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
                        <Icon name="check" size={16} color="#FFFFFF" style={styles.checkIcon} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sensitivityInfo}>
                <Icon name="info" size={14} color="#64748B" />
                <Text style={styles.sensitivityInfoText}>
                  {crashSensitivity === 'low' 
                    ? 'Low sensitivity detects major impacts only'
                    : crashSensitivity === 'medium'
                    ? 'Medium sensitivity balances accuracy and battery'
                    : 'High sensitivity detects minor impacts but uses more battery'}
                </Text>
              </View>
            </View>
          </View>

          {/* ===== ABOUT SECTION ===== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#10B981' }]}>
                <Icon name="info" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.sectionTitle}>About</Text>
            </View>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Icon name="shield" size={22} color="#10B981" />
                <Text style={styles.menuItemText}>Privacy Policy</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Icon name="file-text" size={22} color="#10B981" />
                <Text style={styles.menuItemText}>Terms of Service</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Icon name="mail" size={22} color="#10B981" />
                <Text style={styles.menuItemText}>Contact Support</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* ===== RESET BUTTON ===== */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={showResetConfirm}
            activeOpacity={0.7}
          >
            <Icon name="refresh-ccw" size={20} color="#64748B" />
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.versionText}>Version 2.1.0 • Safety First</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

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
    <View style={[styles.settingIcon, { backgroundColor: `${iconColor}15` }]}>
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#E2E8F0', true: iconColor }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#E2E8F0"
    />
  </View>
);

/* =========================
   STYLES (same as before)
========================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  background: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 32,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  sensitivitySection: {
    paddingVertical: 16,
  },
  sensitivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sensitivityIcon: {
    marginRight: 16,
  },
  sensitivityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  sensitivityDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  sensitivityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sensitivityOption: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: 'column',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  sensitivityOptionActive: {
    borderColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  sensitivityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
  },
  sensitivityOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  sensitivityInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  sensitivityInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    marginLeft: 8,
    lineHeight: 18,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginLeft: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
});