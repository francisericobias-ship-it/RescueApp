import AsyncStorage from '@react-native-async-storage/async-storage';

export type HistoryEvent = {
  id: string;
  type: 'SOS' | 'DRIVING_ON' | 'DRIVING_OFF' | 'CRASH';
  timestamp: number;
  speed?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
};

const STORAGE_KEY = '@history';

export async function saveHistoryEvent(event: HistoryEvent) {
  try {
    const existing = await getHistoryEvents();
    const updated = [event, ...existing];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.log('Error saving history event:', e);
  }
}

export async function getHistoryEvents(): Promise<HistoryEvent[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.log('Error getting history:', e);
    return [];
  }
}

export async function clearHistory() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}