// ProfileScreen.tsx - Complete Modern Medical Profile UI
// No render errors, fully typed, production ready

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define your RootStackParamList type
type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  // Add other screens as needed
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainTabs'
>;

interface UserProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  ext_name?: string;
  username?: string;
  email?: string;
  user_phone_number?: string;
  birth_date?: string;
  relative_number?: string;
  medical_history?: string;
  blood_type?: string;
  allergies?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  profile_picture?: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        return;
      }

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
        Alert.alert('Session Expired', 'Please login again');
        await AsyncStorage.removeItem('token');
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
        return;
      }

      const data = await res.json();
      const finalData = data.data || data;
      
      const enrichedData: UserProfile = {
        ...finalData,
        blood_type: finalData.blood_type || 'Not specified',
        allergies: finalData.allergies || 'None reported',
        medications: finalData.medications || 'None reported',
        emergency_contact_name: finalData.emergency_contact_name || '',
        emergency_contact_relation: finalData.emergency_contact_relation || '',
      };

      setUser(enrichedData);
      setForm(enrichedData);
    } catch (error) {
      console.log('Profile fetch error:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof UserProfile, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      const res = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/auth/me',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            first_name: form.first_name,
            last_name: form.last_name,
            middle_name: form.middle_name,
            ext_name: form.ext_name,
            username: form.username,
            email: form.email,
            user_phone_number: form.user_phone_number,
            birth_date: form.birth_date,
            relative_number: form.relative_number,
            medical_history: form.medical_history,
            blood_type: form.blood_type,
            allergies: form.allergies,
            medications: form.medications,
            emergency_contact_name: form.emergency_contact_name,
            emergency_contact_relation: form.emergency_contact_relation,
          }),
        }
      );

      if (!res.ok) throw new Error('Update failed');

      const updated = await res.json();
      const finalData = updated.data || updated;

      setUser(finalData);
      setForm(finalData);
      setIsEditing(false);

      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] });
          },
        },
      ]
    );
  };

  const getInitials = () => {
    const first = form.first_name?.charAt(0) || '';
    const last = form.last_name?.charAt(0) || '';
    if (!first && !last) return '👤';
    return `${first}${last}`.toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No profile data available</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials()}</Text>
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editNameContainer}>
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={form.first_name || ''}
                  onChangeText={(text) => handleChange('first_name', text)}
                  placeholder="First Name"
                  placeholderTextColor="#8E8E93"
                />
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={form.last_name || ''}
                  onChangeText={(text) => handleChange('last_name', text)}
                  placeholder="Last Name"
                  placeholderTextColor="#8E8E93"
                />
              </View>
              <TextInput
                style={styles.input}
                value={form.email || ''}
                onChangeText={(text) => handleChange('email', text)}
                placeholder="Email"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={form.username || ''}
                onChangeText={(text) => handleChange('username', text)}
                placeholder="Username"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
              />
            </View>
          ) : (
            <>
              <Text style={styles.name}>
                {user.first_name} {user.last_name}
              </Text>
              <Text style={styles.username}>@{user.username}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </>
          )}
        </View>

        {/* Medical ID Card - Emergency Critical Info */}
        <View style={styles.medicalIdCard}>
          <View style={styles.medicalIdHeader}>
            <Icon name="heart" size={20} color="#FF3B30" />
            <Text style={styles.medicalIdTitle}>Medical ID</Text>
            <View style={styles.medicalIdBadge}>
              <Text style={styles.medicalIdBadgeText}>EMERGENCY</Text>
            </View>
          </View>
          
          <View style={styles.medicalIdRow}>
            <View style={styles.medicalIdItem}>
              <Text style={styles.medicalIdLabel}>Blood Type</Text>
              {isEditing ? (
                <TextInput
                  style={styles.medicalIdInput}
                  value={form.blood_type || ''}
                  onChangeText={(text) => handleChange('blood_type', text)}
                  placeholder="A+, B-, O+, etc."
                  placeholderTextColor="#8E8E93"
                />
              ) : (
                <Text style={styles.medicalIdValue}>{user.blood_type || 'Not specified'}</Text>
              )}
            </View>
            <View style={styles.medicalIdDivider} />
            <View style={styles.medicalIdItem}>
              <Text style={styles.medicalIdLabel}>Birth Date</Text>
              {isEditing ? (
                <TextInput
                  style={styles.medicalIdInput}
                  value={form.birth_date || ''}
                  onChangeText={(text) => handleChange('birth_date', text)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#8E8E93"
                />
              ) : (
                <Text style={styles.medicalIdValue}>{user.birth_date || 'Not specified'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Icon name="phone" size={20} color="#FF3B30" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              {isEditing ? (
                <TextInput
                  style={styles.infoInput}
                  value={form.user_phone_number || ''}
                  onChangeText={(text) => handleChange('user_phone_number', text)}
                  placeholder="Enter phone number"
                  placeholderTextColor="#8E8E93"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{user.user_phone_number || 'Not provided'}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="users" size={20} color="#FF3B30" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
              {isEditing ? (
                <>
                  <TextInput
                    style={styles.infoInput}
                    value={form.emergency_contact_name || ''}
                    onChangeText={(text) => handleChange('emergency_contact_name', text)}
                    placeholder="Contact name"
                    placeholderTextColor="#8E8E93"
                  />
                  <TextInput
                    style={[styles.infoInput, { marginTop: 8 }]}
                    value={form.emergency_contact_relation || ''}
                    onChangeText={(text) => handleChange('emergency_contact_relation', text)}
                    placeholder="Relationship (e.g., Spouse, Parent)"
                    placeholderTextColor="#8E8E93"
                  />
                  <TextInput
                    style={[styles.infoInput, { marginTop: 8 }]}
                    value={form.relative_number || ''}
                    onChangeText={(text) => handleChange('relative_number', text)}
                    placeholder="Emergency phone number"
                    placeholderTextColor="#8E8E93"
                    keyboardType="phone-pad"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.infoValue}>
                    {user.emergency_contact_name || 'Not set'}
                    {user.emergency_contact_relation ? ` (${user.emergency_contact_relation})` : ''}
                  </Text>
                  <Text style={[styles.infoValue, { marginTop: 4, color: '#007AFF' }]}>
                    {user.relative_number || 'No emergency contact'}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Medical Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Medical Information</Text>
          
          <View style={styles.infoRow}>
            <Icon name="alert-circle" size={20} color="#FF9F0A" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Allergies</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.infoInput, styles.textArea]}
                  value={form.allergies || ''}
                  onChangeText={(text) => handleChange('allergies', text)}
                  placeholder="List any allergies (medications, foods, etc.)"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.infoValue}>{user.allergies || 'None reported'}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="package" size={20} color="#34C759" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Current Medications</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.infoInput, styles.textArea]}
                  value={form.medications || ''}
                  onChangeText={(text) => handleChange('medications', text)}
                  placeholder="List current medications and dosages"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text style={styles.infoValue}>{user.medications || 'None reported'}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Icon name="file-text" size={20} color="#5856D6" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Medical History</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.infoInput, styles.textAreaLarge]}
                  value={form.medical_history || ''}
                  onChangeText={(text) => handleChange('medical_history', text)}
                  placeholder="Previous conditions, surgeries, etc."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <Text style={styles.infoValue}>{user.medical_history || 'No medical history provided'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Icon name="edit-2" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Icon name="log-out" size={20} color="#FF3B30" />
            <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>RescueLink v1.0.0</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  headerSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editNameContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  nameInput: {
    flex: 1,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#007AFF',
  },

  // Medical ID Card
  medicalIdCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  medicalIdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicalIdTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginLeft: 8,
    flex: 1,
  },
  medicalIdBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicalIdBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  medicalIdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  medicalIdItem: {
    flex: 1,
  },
  medicalIdLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  medicalIdValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  medicalIdDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  medicalIdInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    padding: 0,
  },

  // Cards
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  infoInput: {
    fontSize: 15,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#F2F2F7',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    height: 100,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },

  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F2F2F7',
    color: '#1C1C1E',
    marginBottom: 8,
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#007AFF',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#34C759',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutText: {
    color: '#FF3B30',
  },

  // Footer
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 16,
  },
});