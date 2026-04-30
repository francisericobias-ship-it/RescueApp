// OnboardingScreen.tsx - Modern Emergency Healthcare Onboarding
// FIXED: Proper FlatList implementation for horizontal scrolling

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

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

interface OnboardingPage {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  backgroundColor: string;
  iconColor: string;
}

const onboardingPages: OnboardingPage[] = [
  {
    id: '1',
    title: 'Welcome to RescueLink',
    subtitle: 'Your emergency companion with real-time SOS alerts and crash detection.',
    icon: 'heart',
    backgroundColor: '#0A3C5F',
    iconColor: '#FF3B30',
  },
  {
    id: '2',
    title: 'One Tap Emergency',
    subtitle: 'Send emergency alerts instantly with your GPS location to emergency services.',
    icon: 'alert-triangle',
    backgroundColor: '#0A3C5F',
    iconColor: '#FF9F0A',
  },
  {
    id: '3',
    title: 'Live Location Sharing',
    subtitle: 'Responders can track your location in real-time during emergencies.',
    icon: 'map-pin',
    backgroundColor: '#0A3C5F',
    iconColor: '#34C759',
  },
  {
    id: '4',
    title: 'Offline Mesh Network',
    subtitle: 'Stay connected even without internet using peer-to-peer mesh technology.',
    icon: 'wifi-off',
    backgroundColor: '#0A3C5F',
    iconColor: '#007AFF',
  },
  {
    id: '5',
    title: 'Crash Detection',
    subtitle: 'Automatic crash detection alerts emergency services when you need them most.',
    icon: 'activity',
    backgroundColor: '#0A3C5F',
    iconColor: '#FF3B30',
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentPage < onboardingPages.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentPage + 1,
        animated: true,
      });
      setCurrentPage(currentPage + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = async () => {
    await handleGetStarted();
  };

  const handleGetStarted = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    navigation.replace('Login');
  };

  const handleScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const page = Math.round(offset / width);
    setCurrentPage(page);
  };

  const renderPage = ({ item }: { item: OnboardingPage }) => {
    return (
      <View style={[styles.pageContainer, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.contentContainer}>
          {/* Icon Container */}
          <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '20' }]}>
            <Icon name={item.icon} size={64} color={item.iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{item.title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>{item.subtitle}</Text>

          {/* Features List for last page */}
          {item.id === '5' && (
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>24/7 Emergency Support</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Real-time GPS Tracking</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Offline Mesh Network</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={20} color="#34C759" />
                <Text style={styles.featureText}>Auto Crash Detection</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={onboardingPages[currentPage]?.backgroundColor || '#0A3C5F'} />
      
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Pages - Using FlatList for horizontal scroll */}
      <FlatList
        ref={flatListRef}
        data={onboardingPages}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {onboardingPages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentPage === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      {/* Next/Get Started Button */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>
          {currentPage === onboardingPages.length - 1 ? 'Get Started' : 'Next'}
        </Text>
        <Icon
          name={currentPage === onboardingPages.length - 1 ? 'check' : 'arrow-right'}
          size={20}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A3C5F',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  flatList: {
    flex: 1,
  },
  pageContainer: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    marginTop: 20,
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 12,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: '#FF3B30',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default OnboardingScreen;