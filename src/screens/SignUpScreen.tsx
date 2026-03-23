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

      {/* PERSONAL INFO */}
      <Text style={styles.sectionTitle}>Personal Info</Text>

      <TextInput style={styles.input} placeholder="First Name" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Last Name" value={lastName} onChangeText={setLastName} />
      <TextInput style={styles.input} placeholder="Middle Name" value={middleName} onChangeText={setMiddleName} />
      <TextInput style={styles.input} placeholder="Ext Name (Optional)" value={extName} onChangeText={setExtName} />

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
        keyboardType="phone-pad"
        value={userPhoneNumber}
        onChangeText={setUserPhoneNumber}
      />

      {/* ACCOUNT INFO */}
      <Text style={styles.sectionTitle}>Account Info</Text>

      <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Username" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={passwordConfirmation} onChangeText={setPasswordConfirmation} />

      {/* EMERGENCY CONTACT */}
      <Text style={styles.sectionTitle}>Emergency Contact</Text>

      <TextInput
        style={styles.input}
        placeholder="Relative Number"
        keyboardType="phone-pad"
        value={relativeNumber}
        onChangeText={setRelativeNumber}
      />

      {/* SIGN UP BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      {/* 🔥 SEPARATED LOGIN BUTTON */}
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
    paddingHorizontal: 20,
  },

  content: {
    paddingVertical: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 30,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 10,
    marginTop: 10,
  },

  input: {
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  dateText: {
    color: '#111827',
  },

  button: {
    height: 55,
    backgroundColor: '#e74c3c',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* 🔥 LOGIN SECTION */
  loginContainer: {
    marginTop: 25,
    alignItems: 'center',
  },

  loginLabel: {
    color: '#6B7280',
    marginBottom: 8,
  },

  loginButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e74c3c',
  },

  loginButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 15,
  },
});