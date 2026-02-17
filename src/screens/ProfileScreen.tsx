import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('TOKEN:', token);

      const res = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/auth/me',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 401) {
        Alert.alert('Session expired', 'Please login again');
        await AsyncStorage.removeItem('token');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        return;
      }

      const data = await res.json();
      console.log('PROFILE:', data);

      setUser(data);
    } catch (error) {
      console.log('Profile fetch error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('token');
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  // 🔄 Loading UI
  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  // ❌ No user
  if (!user) {
    return (
      <View style={styles.center}>
        <Text>No profile data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerBackground} />

        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
        </View>

        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <InfoRow icon="user" label="Role" value={user.role} />
        <InfoRow icon="hash" label="User ID" value={String(user.id)} />
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Icon name="log-out" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.logoutText}>LOGOUT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// 🔹 Info Row Component
interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        <Icon name={icon} size={20} color="#6366F1" />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  content: { padding: 20, paddingBottom: 40 },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    height: 150,
    width: '100%',
    backgroundColor: '#6366F1',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarWrapper: {
    marginTop: 60,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 4,
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },

  name: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
  },

  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 30,
    elevation: 4,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});