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
const MAX_HISTORY = 100; // 🔥 limit para di bumigat

/* ---------------- SAFE PARSE ---------------- */
const safeParse = (data: string | null): HistoryEvent[] => {
  try {
    return data ? JSON.parse(data) : [];
  } catch {
    console.log('Corrupted history data, resetting...');
    return [];
  }
};

/* ---------------- GET ---------------- */
export async function getHistoryEvents(): Promise<HistoryEvent[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = safeParse(data);

    // 🔥 ensure sorted (latest first)
    return parsed.sort((a, b) => b.timestamp - a.timestamp);

  } catch (e) {
    console.log('Error getting history:', e);
    return [];
  }
}

/* ---------------- SAVE ---------------- */
export async function saveHistoryEvent(event: HistoryEvent) {
  try {
    const existing = await getHistoryEvents();

    // 🔥 prevent duplicate (same id)
    const filtered = existing.filter(item => item.id !== event.id);

    const updated = [event, ...filtered].slice(0, MAX_HISTORY);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  } catch (e) {
    console.log('Error saving history event:', e);
  }
}

/* ---------------- CLEAR ---------------- */
export async function clearHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.log('Error clearing history:', e);
  }
}