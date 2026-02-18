import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from 'axios';

export default function SignUpScreen({ navigation }) {
  // State variables for form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [extName, setExtName] = useState('');
  const [userPhoneNumber, setUserPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(false);

  // Handler for sign-up button
  const handleSignUp = async () => {
    // Basic validation
    if (
      !firstName || !lastName || !middleName || !extName ||
      !userPhoneNumber || !email || !username || !password || !passwordConfirmation
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/auth/register',
        {
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          ext_name: extName,
          username,
          email,
          password,
          password_confirmation: passwordConfirmation,
          user_phone_number: userPhoneNumber,
          role: 'admin', // Adjust role as needed
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      Alert.alert('Success', response.data.message || 'User registered');
      if (navigation?.navigate) {
        navigation.navigate('Login');
      }
    } catch (error) {
      console.log('Axios error:', error);
      if (error.response) {
        Alert.alert(
          'Error',
          error.response.data?.message || 'Failed to create account'
        );
      } else if (error.request) {
        Alert.alert('Error', 'No response from server');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create an Account</Text>

      {/* Input Fields */}
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder="Middle Name"
        value={middleName}
        onChangeText={setMiddleName}
      />
      <TextInput
        style={styles.input}
        placeholder="Ext Name"
        value={extName}
        onChangeText={setExtName}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={userPhoneNumber}
        onChangeText={setUserPhoneNumber}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={passwordConfirmation}
        onChangeText={setPasswordConfirmation}
      />

      {/* Sign Up Button */}
      <TouchableOpacity
        style={[styles.signupButton, loading && styles.disabledButton]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.signupText}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  content: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  signupButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  signupText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});