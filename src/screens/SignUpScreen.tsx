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
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SignUpScreen({ navigation }) {
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
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const res = await axios.post(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/auth/register',
        {
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
        }
      );

      Alert.alert('Success', res.data.message || 'Account created!');
      navigation.navigate('Login');

    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Account</Text>

      <View style={styles.form}>
        {/* PERSONAL INFO */}
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <TextInput
          style={styles.input}
          placeholder="First Name"
          placeholderTextColor="#9CA3AF"
          value={firstName}
          onChangeText={setFirstName}
        />
        <TextInput
          style={styles.input}
          placeholder="Last Name"
          placeholderTextColor="#9CA3AF"
          value={lastName}
          onChangeText={setLastName}
        />
        <TextInput
          style={styles.input}
          placeholder="Middle Name"
          placeholderTextColor="#9CA3AF"
          value={middleName}
          onChangeText={setMiddleName}
        />
        <TextInput
          style={styles.input}
          placeholder="Ext Name (Optional)"
          placeholderTextColor="#9CA3AF"
          value={extName}
          onChangeText={setExtName}
        />

        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>Birth Date: {formatDate(birthDate)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onChangeDate}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={userPhoneNumber}
          onChangeText={setUserPhoneNumber}
        />

        {/* ACCOUNT INFO */}
        <Text style={styles.sectionTitle}>Account Info</Text>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#9CA3AF"
          value={username}
          onChangeText={setUsername}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
        />

        {/* EMERGENCY CONTACT */}
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <TextInput
          style={styles.input}
          placeholder="Relative Number"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={relativeNumber}
          onChangeText={setRelativeNumber}
        />

        {/* SIGN UP BUTTON */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 🔥 LOGIN LINK */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginLabel}>Already have an account?</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  content: {
    paddingVertical: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 10,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    fontSize: 16,
    color: '#111827',
  },
  dateText: {
    color: '#111827',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  loginLabel: {
    color: '#6B7280',
    marginBottom: 8,
  },
  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e74c3c',
  },
  loginButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
});