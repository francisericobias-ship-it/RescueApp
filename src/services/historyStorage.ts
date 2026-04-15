import AsyncStorage from '@react-native-async-storage/async-storage';

/* ---------------- TYPES ---------------- */
export type HistoryEventType =
  | 'SOS'
  | 'DRIVING_ON'
  | 'DRIVING_OFF'
  | 'CRASH'
  | 'CRASH_CANCELLED'
  | 'ADMIN_ACCEPTED'; // 🔥 NEW

export type HistoryEvent = {
  id: string;
  type: HistoryEventType;
  timestamp: number;
  speed?: number;
  latitude?: number;
  longitude?: number;
  description?: string;
};

/* ---------------- CONSTANTS ---------------- */
const STORAGE_KEY = '@history';
const MAX_HISTORY = 100;

/* ---------------- SAFE PARSE ---------------- */
const safeParse = (data: string | null): HistoryEvent[] => {
  try {
    return data ? JSON.parse(data) : [];
  } catch {
    console.log('⚠️ Corrupted history data, resetting...');
    return [];
  }
};

/* ---------------- GET ---------------- */
export async function getHistoryEvents(): Promise<HistoryEvent[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(data);

    // 🔥 sort newest first
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.log('❌ Error getting history:', e);
    return [];
  }
}

/* ---------------- SAVE ---------------- */
export async function saveHistoryEvent(event: HistoryEvent) {
  try {
    const existing = await getHistoryEvents();

    // 🔥 remove duplicate ID if exists
    const filtered = existing.filter(item => item.id !== event.id);

    // 🔥 add new event on top + limit size
    const updated = [event, ...filtered].slice(0, MAX_HISTORY);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    console.log('✅ Saved event:', event.type);
  } catch (e) {
    console.log('❌ Error saving history event:', e);
  }
}

/* ---------------- CLEAR ---------------- */
export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ History cleared');
  } catch (e) {
    console.log('❌ Error clearing history:', e);
  }
}