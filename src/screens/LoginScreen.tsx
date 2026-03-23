import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface Props {
  navigation: LoginScreenNavigationProp;
  onLogin?: () => void;
}

export default function LoginScreen({ navigation, onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadRemember = async () => {
      try {
        const remember = await AsyncStorage.getItem('rememberMe');
        const token = await AsyncStorage.getItem('token');

        if (remember === 'true') setRememberMe(true);

        if (remember === 'true' && token) {
          navigation.replace('MainTabs');
          if (onLogin) onLogin();
        }
      } catch (e) {
        console.log('Error loading Remember Me:', e);
      }
    };

    loadRemember();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        'https://rescuelink-backend-j0gz.onrender.com/api/v1/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            password: password.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
        return;
      }

      const token = data.access_token;

      if (!token) {
        Alert.alert('Error', 'No token received');
        return;
      }

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');

      if (onLogin) onLogin();

      navigation.replace('MainTabs');
    } catch (error) {
      console.log('LOGIN ERROR:', error);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>RescueLink</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
      </View>

      {/* FORM */}
      <View style={styles.form}>

        {/* EMAIL */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* PASSWORD */}
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* REMEMBER ME */}
        <View style={styles.rememberMeContainer}>
          <TouchableOpacity
            onPress={() => setRememberMe(!rememberMe)}
            style={styles.checkbox}
          >
            {rememberMe && <View style={styles.checkedBox} />}
          </TouchableOpacity>
          <Text style={styles.rememberMeText}>Remember Me</Text>
        </View>

        {/* LOGIN BUTTON */}
        <Pressable
          style={[styles.loginButton, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </Pressable>

        {/* FORGOT PASSWORD */}
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={() => Alert.alert('Info', 'Reset password coming soon')}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don’t have an account?</Text>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    padding: 24,
  },

  header: {
    marginBottom: 40,
    alignItems: 'center',
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#e74c3c',
  },

  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },

  form: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
  },

  /* 🔥 BORDERLESS INPUT */
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    fontSize: 16,
    color: '#111827',
  },

  loginButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },

  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },

  forgotButton: {
    marginTop: 12,
    alignItems: 'center',
  },

  forgotText: {
    color: '#6B7280',
    fontSize: 14,
  },

  footer: {
    marginTop: 30,
    alignItems: 'center',
  },

  footerText: {
    color: '#6B7280',
    marginBottom: 8,
  },

  signupButton: {
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e74c3c',
  },

  signupButtonText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },

  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  checkedBox: {
    width: 12,
    height: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 3,
  },

  rememberMeText: {
    fontSize: 14,
    color: '#111827',
  },
});