// SignUpScreen.tsx - Modern Emergency Healthcare Sign Up
// WITH Terms & Privacy Modal (Scrollable)

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
  Modal,
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
  
  // Terms and Conditions state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  
  // Modal visibility
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const role = 'admin';

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (selectedDate) setBirthDate(selectedDate);
  };

  // Terms of Service Content
  const TermsContent = () => (
    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.modalTitle}>Terms of Service</Text>
      <Text style={styles.modalDate}>Last Updated: January 1, 2024</Text>
      
      <Text style={styles.modalSectionTitle}>1. Acceptance of Terms</Text>
      <Text style={styles.modalText}>
        By downloading, accessing, or using RescueLink, you agree to be bound by these Terms of Service. 
        If you do not agree to these terms, please do not use our application.
      </Text>
      
      <Text style={styles.modalSectionTitle}>2. Emergency Services</Text>
      <Text style={styles.modalText}>
        RescueLink is designed to assist in emergency situations. While we strive for reliability, 
        we cannot guarantee that emergency services will always be notified or that response times 
        will be immediate. You should always contact emergency services directly when possible.
      </Text>
      
      <Text style={styles.modalSectionTitle}>3. Location Tracking</Text>
      <Text style={styles.modalText}>
        RescueLink requires access to your location to provide emergency services. Your location data 
        is only shared with emergency services when you trigger an SOS alert. We do not sell or share 
        your location data with third parties for marketing purposes.
      </Text>
      
      <Text style={styles.modalSectionTitle}>4. User Responsibilities</Text>
      <Text style={styles.modalText}>
        You are responsible for maintaining the confidentiality of your account. You agree to provide 
        accurate and complete information during registration. You may not use RescueLink for any 
        illegal or unauthorized purpose.
      </Text>
      
      <Text style={styles.modalSectionTitle}>5. Medical Information</Text>
      <Text style={styles.modalText}>
        Any medical information you provide is stored securely and is only shared with emergency 
        responders when you activate emergency features. This information can help save your life 
        in emergency situations.
      </Text>
      
      <Text style={styles.modalSectionTitle}>6. Limitation of Liability</Text>
      <Text style={styles.modalText}>
        RescueLink is provided "as is" without warranties. We are not liable for any damages arising 
        from your use of the application, including but not limited to failure to notify emergency 
        services, technical issues, or data loss.
      </Text>
      
      <Text style={styles.modalSectionTitle}>7. Changes to Terms</Text>
      <Text style={styles.modalText}>
        We may modify these terms at any time. Continued use of RescueLink after changes constitutes 
        acceptance of the new terms.
      </Text>
      
      <Text style={styles.modalSectionTitle}>8. Contact Us</Text>
      <Text style={styles.modalText}>
        For questions about these Terms, contact us at: support@rescuelink.com
      </Text>
    </ScrollView>
  );

  // Privacy Policy Content
  const PrivacyContent = () => (
    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.modalTitle}>Privacy Policy</Text>
      <Text style={styles.modalDate}>Last Updated: January 1, 2024</Text>
      
      <Text style={styles.modalSectionTitle}>1. Information We Collect</Text>
      <Text style={styles.modalText}>
        <Text style={styles.boldText}>Personal Information:</Text> Name, email address, phone number, 
        and emergency contact information that you provide during registration.
      </Text>
      <Text style={styles.modalText}>
        <Text style={styles.boldText}>Location Data:</Text> Real-time GPS location when you use emergency 
        features. This is only collected when you trigger an SOS or have driving mode enabled.
      </Text>
      <Text style={styles.modalText}>
        <Text style={styles.boldText}>Medical Information:</Text> Health conditions, allergies, medications, 
        and blood type that you voluntarily provide.
      </Text>
      <Text style={styles.modalText}>
        <Text style={styles.boldText}>Device Information:</Text> Device ID, operating system, and app version 
        for technical support purposes.
      </Text>
      
      <Text style={styles.modalSectionTitle}>2. How We Use Your Information</Text>
      <Text style={styles.modalText}>
        • To notify emergency services of your location during emergencies
      </Text>
      <Text style={styles.modalText}>
        • To share critical medical information with first responders
      </Text>
      <Text style={styles.modalText}>
        • To improve our emergency response features
      </Text>
      <Text style={styles.modalText}>
        • To communicate important updates about the service
      </Text>
      
      <Text style={styles.modalSectionTitle}>3. Data Sharing</Text>
      <Text style={styles.modalText}>
        We only share your information with:
      </Text>
      <Text style={styles.modalText}>
        • Emergency services when you activate SOS
      </Text>
      <Text style={styles.modalText}>
        • First responders accessing your Medical ID
      </Text>
      <Text style={styles.modalText}>
        • As required by law or to protect safety
      </Text>
      <Text style={styles.modalText}>
        We NEVER sell your personal data to third parties.
      </Text>
      
      <Text style={styles.modalSectionTitle}>4. Data Security</Text>
      <Text style={styles.modalText}>
        We use industry-standard encryption to protect your data. Your location and medical information 
        are stored securely and only accessed during emergencies.
      </Text>
      
      <Text style={styles.modalSectionTitle}>5. Your Rights</Text>
      <Text style={styles.modalText}>
        You can access, correct, or delete your personal information at any time through the app settings. 
        You may also request data export or account deletion by contacting support.
      </Text>
      
      <Text style={styles.modalSectionTitle}>6. Data Retention</Text>
      <Text style={styles.modalText}>
        We retain your personal data while your account is active. Emergency history is kept for 30 days 
        unless you manually delete it. You may request complete deletion at any time.
      </Text>
      
      <Text style={styles.modalSectionTitle}>7. Children's Privacy</Text>
      <Text style={styles.modalText}>
        RescueLink is not intended for children under 13. We do not knowingly collect information from 
        children under 13.
      </Text>
      
      <Text style={styles.modalSectionTitle}>8. Contact Us</Text>
      <Text style={styles.modalText}>
        For privacy questions or concerns: privacy@rescuelink.com
      </Text>
    </ScrollView>
  );

  const handleSignUp = async () => {
    // Check required fields
    if (
      !firstName || !lastName || !middleName || !userPhoneNumber ||
      !email || !username || !password || !passwordConfirmation || !relativeNumber
    ) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }

    // Check Terms and Conditions
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert(
        'Terms Required',
        'Please accept the Terms of Service and Privacy Policy to continue'
      );
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
            terms_accepted: termsAccepted,
            privacy_accepted: privacyAccepted,
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

  // Terms Modal
  const TermsModal = () => (
    <Modal
      visible={showTermsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowTermsModal(false)}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Terms of Service</Text>
          <TouchableOpacity 
            onPress={() => setShowTermsModal(false)} 
            style={styles.modalCloseButton}
          >
            <Icon name="x" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        <TermsContent />
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.modalAcceptButton}
            onPress={() => {
              setTermsAccepted(true);
              setShowTermsModal(false);
            }}
          >
            <Text style={styles.modalAcceptButtonText}>Accept Terms</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  // Privacy Modal
  const PrivacyModal = () => (
    <Modal
      visible={showPrivacyModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPrivacyModal(false)}
    >
      <SafeAreaView style={styles.modalSafeArea}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalHeaderTitle}>Privacy Policy</Text>
          <TouchableOpacity 
            onPress={() => setShowPrivacyModal(false)} 
            style={styles.modalCloseButton}
          >
            <Icon name="x" size={24} color="#1C1C1E" />
          </TouchableOpacity>
        </View>
        <PrivacyContent />
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.modalAcceptButton}
            onPress={() => {
              setPrivacyAccepted(true);
              setShowPrivacyModal(false);
            }}
          >
            <Text style={styles.modalAcceptButtonText}>Accept Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />
      
      <TermsModal />
      <PrivacyModal />
      
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
                  placeholder="First Name *"
                  placeholderTextColor="#8E8E93"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Last Name *"
                  placeholderTextColor="#8E8E93"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Middle Name *"
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
                placeholder="Phone Number *"
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
                placeholder="Email Address *"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                style={styles.input}
                placeholder="Username *"
                placeholderTextColor="#8E8E93"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Password *"
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
                  placeholder="Confirm Password *"
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
                placeholder="Emergency Contact Number *"
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

            {/* Terms and Conditions Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Icon name="file-text" size={18} color="#5856D6" />
                <Text style={styles.sectionTitle}>Legal Agreement</Text>
              </View>

              {/* Terms of Service Checkbox */}
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setShowTermsModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                  {termsAccepted && <Icon name="check" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>
                  I accept the{' '}
                  <Text style={styles.linkText}>Terms of Service</Text>
                </Text>
                <Icon name="chevron-right" size={18} color="#C6C6C8" />
              </TouchableOpacity>

              {/* Privacy Policy Checkbox */}
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setShowPrivacyModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
                  {privacyAccepted && <Icon name="check" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.checkboxText}>
                  I accept the{' '}
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </Text>
                <Icon name="chevron-right" size={18} color="#C6C6C8" />
              </TouchableOpacity>

              <Text style={styles.legalHelperText}>
                Tap to read and accept our Terms of Service and Privacy Policy.
                By creating an account, you agree to our legal terms.
              </Text>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.signUpButton, 
                loading && styles.buttonDisabled,
                (!termsAccepted || !privacyAccepted) && styles.buttonDisabled
              ]}
              onPress={handleSignUp}
              disabled={loading || !termsAccepted || !privacyAccepted}
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
  // Terms and Conditions Styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  checkboxText: {
    fontSize: 14,
    color: '#1C1C1E',
    flex: 1,
  },
  linkText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  legalHelperText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 8,
    lineHeight: 16,
    textAlign: 'center',
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
  // Modal Styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginTop: 20,
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF3B30',
    marginTop: 20,
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 22,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: '700',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  modalAcceptButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});