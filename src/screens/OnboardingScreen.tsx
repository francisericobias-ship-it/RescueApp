import React from 'react';
import Onboarding from 'react-native-onboarding-swiper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
};

type OnboardingScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

type Props = {
  navigation: OnboardingScreenNavigationProp;
};

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  
  const handleDone = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    navigation.replace('Login');
  };

  return (
    <Onboarding
      onSkip={handleDone}
      onDone={handleDone}
      pages={[
        {
          backgroundColor: '#fff',
          title: 'Welcome to RescueLink',
          subtitle: 'Your emergency companion with real-time SOS alerts.',
        },
        {
          backgroundColor: '#fdeb93',
          title: 'One Tap Emergency',
          subtitle: 'Send emergency alerts instantly with GPS location.',
        },
        {
          backgroundColor: '#e9bcbe',
          title: 'Live Location Sharing',
          subtitle: 'Responders can track your location in real-time.',
        },
        {
          backgroundColor: '#a6e4d0',
          title: 'Stay Safe. Stay Connected.',
          subtitle: 'RescueLink keeps you protected when it matters most.',
        },
      ]}
    />
  );
};

export default OnboardingScreen;