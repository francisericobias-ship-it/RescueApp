// SignUpScreen.tsx - Modern Emergency Healthcare Sign Up

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Feather';

export default function SignUpScreen({ navigation }: any) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [extName, setExtName] = useState('');
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [relativeNumber, setRelativeNumber] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const role = 'admin';

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selectedDate) setBirthDate(selectedDate);
  };

  const handleSignUp = async () => {
    if (
      !firstName || !lastName || !middleName || !userPhoneNumber ||
      !email || !username || !password || !passwordConfirmation || !relativeNumber
    ) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('Password Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Error', 'Password must be at least 6 characters');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            ext_name: extName || null,
            username,
            email,
            password,
            password_confirmation: passwordConfirmation,
            user_phone_number: userPhoneNumber,
            role,
            birth_date: formatDate(birthDate),
            relative_number: relativeNumber,
            medical_history: medicalHistory,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      Alert.alert(
        'Account Created Successfully!',
        'Please login to continue.',
        [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Icon name="heart" size={48} color="#FF3B30" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join RescueLink for emergency protection</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Personal Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="user" size={18} color="#FF3B30" />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="First Name"
                  placeholderTextColor="#8E8E93"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Last Name"
                  placeholderTextColor="#8E8E93"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Middle Name"
                placeholderTextColor="#8E8E93"
                value={middleName}
                onChangeText={setMiddleName}
              />

              <TextInput
                style={styles.input}
                placeholder="Extension Name (Jr., Sr., III)"
                placeholderTextColor="#8E8E93"
                value={extName}
                onChangeText={setExtName}
              />

              <TouchableOpacity 
                style={styles.datePickerButton} 
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={20} color="#8E8E93" />
                <Text style={styles.dateText}>Birth Date: {formatDate(birthDate)}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  onChange={onChangeDate}
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#8E8E93"
                keyboardType="phone-pad"
                value={userPhoneNumber}
                onChangeText={setUserPhoneNumber}
              />
            </View>

            {/* Account Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="lock" size={18} color="#007AFF" />
                <Text style={styles.sectionTitle}>Account Information</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm Password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry={!showConfirmPassword}
                  value={passwordConfirmation}
                  onChangeText={setPasswordConfirmation}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Emergency Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="alert-triangle" size={18} color="#FF9F0A" />
                <Text style={styles.sectionTitle}>Emergency Contact</Text>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Emergency Contact Number"
                placeholderTextColor="#8E8E93"
                keyboardType="phone-pad"
                value={relativeNumber}
                onChangeText={setRelativeNumber}
              />
              <Text style={styles.helperText}>
                This number will be contacted in case of emergency
              </Text>
            </View>

            {/* Medical Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="heart" size={18} color="#34C759" />
                <Text style={styles.sectionTitle}>Medical Information</Text>
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Medical History (allergies, conditions, medications)"
                placeholderTextColor="#8E8E93"
                multiline
                numberOfLines={4}
                value={medicalHistory}
                onChangeText={setMedicalHistory}
              />
              <Text style={styles.helperText}>
                This helps first responders provide better care
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signUpButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.signUpButtonText}>Create Account</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginLabel}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Terms */}
            <Text style={styles.termsText}>
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF3B3015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  form: {
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
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
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  halfInput: {
    flex: 1,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: -8,
    marginBottom: 8,
  },
  signUpButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  loginLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  loginLink: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 16,
    marginBottom: 20,
  },
});