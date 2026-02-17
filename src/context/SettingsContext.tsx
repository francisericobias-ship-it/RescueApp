// src/context/SettingsContext.tsx
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CrashSensitivity = 'low' | 'medium' | 'high';

interface SettingsContextType {
  crashSensitivity: CrashSensitivity;
  setCrashSensitivity: (val: CrashSensitivity) => void;
}

export const SettingsContext = createContext<SettingsContextType>({
  crashSensitivity: 'medium',
  setCrashSensitivity: () => {},
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [crashSensitivity, setCrashSensitivity] = useState<CrashSensitivity>('medium');

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem('@settings_crash_sensitivity').then((val) => {
      if (val === 'low' || val === 'medium' || val === 'high') setCrashSensitivity(val);
    });
  }, []);

  // Save to storage when changed
  useEffect(() => {
    AsyncStorage.setItem('@settings_crash_sensitivity', crashSensitivity);
  }, [crashSensitivity]);

  return (
    <SettingsContext.Provider value={{ crashSensitivity, setCrashSensitivity }}>
      {children}
    </SettingsContext.Provider>
  );
};
