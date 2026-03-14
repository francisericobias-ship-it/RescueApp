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
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match');
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
      Alert.alert('Success', res.data.message || 'User registered');
      navigation.navigate('Login');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Network/server error');
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
      <Text style={styles.title}>Create Your RescueLink Account</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <TextInput style={styles.input} placeholder="First Name" value={firstName} onChangeText={setFirstName} />
        <TextInput style={styles.input} placeholder="Last Name" value={lastName} onChangeText={setLastName} />
        <TextInput style={styles.input} placeholder="Middle Name" value={middleName} onChangeText={setMiddleName} />
        <TextInput style={styles.input} placeholder="Ext Name (Optional)" value={extName} onChangeText={setExtName} />
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text>Birth Date: {formatDate(birthDate)}</Text>
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
        <TextInput style={styles.input} placeholder="Phone Number" keyboardType="phone-pad" value={userPhoneNumber} onChangeText={setUserPhoneNumber} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Info</Text>
        <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={passwordConfirmation} onChangeText={setPasswordConfirmation} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <TextInput style={styles.input} placeholder="Relative Number" keyboardType="phone-pad" value={relativeNumber} onChangeText={setRelativeNumber} />
      </View>

      <TouchableOpacity
        style={[styles.signupButton, loading && styles.disabledButton]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.signupText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20 },
  content: { paddingVertical: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, color: '#e74c3c', marginBottom: 10, fontWeight: '600' },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    justifyContent: 'center',
    color: '#fff',
  },
  signupButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: { backgroundColor: '#999' },
  signupText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});