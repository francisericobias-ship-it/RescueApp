import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
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

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text>No profile data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header with Avatar */}
      <View style={styles.headerSection}>
        {/* Use remote image as fallback */}
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>
          {user.first_name} {user.last_name}
        </Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      {/* User Info Details */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Icon name="phone" size={20} color="#6B7280" style={styles.icon} />
          <Text style={styles.infoText}>Phone: {user.user_phone_number}</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="calendar" size={20} color="#6B7280" style={styles.icon} />
          <Text style={styles.infoText}>Birth Date: {user.birth_date}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Emergency Contact */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <View style={styles.infoRow}>
          <Icon name="user" size={20} color="#6B7280" style={styles.icon} />
          <Text style={styles.infoText}>{user.relative_number || 'N/A'}</Text>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.footerSection}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
          onPress={handleLogout}
        >
          <Icon name="log-out" size={20} color="#fff" style={styles.iconButton} />
          <Text style={styles.actionButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  content: { padding: 20 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#D1D5DB', // Placeholder color if no image
  },
  name: { fontSize: 24, fontWeight: '700', color: '#111827' },
  username: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  email: { fontSize: 14, color: '#374151', marginTop: 4 },

  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  icon: { marginRight: 10 },
  infoText: { fontSize: 14, color: '#111827' },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f16363',
    marginBottom: 10,
  },

  footerSection: {
    marginTop: 10,
    alignItems: 'center',
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    width: '100%',
  },
  iconButton: {
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});