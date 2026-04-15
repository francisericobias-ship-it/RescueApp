import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import {
  getHistoryEvents,
  clearHistory as clearHistoryStorage,
  HistoryEvent,
} from '../services/historyStorage';

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMounted = useRef(true);

  /* ---------------- LOAD HISTORY ---------------- */
  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getHistoryEvents();

      const sorted = data.sort((a, b) => b.timestamp - a.timestamp);

      if (isMounted.current) {
        setHistory(sorted);
      }
    } catch (error) {
      console.log('Error loading history:', error);
      if (isMounted.current) {
        setHistory([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  /* ---------------- FOCUS ---------------- */
  useFocusEffect(
    useCallback(() => {
      isMounted.current = true;
      loadHistory();

      return () => {
        isMounted.current = false;
      };
    }, [])
  );

  /* ---------------- REFRESH ---------------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, []);

  /* ---------------- CLEAR HISTORY ---------------- */
  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistoryStorage();
              setHistory([]);
            } catch {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  /* ---------------- ICON ---------------- */
  const getIcon = (type: string) => {
    switch (type) {
      case 'SOS':
        return { name: 'alert-circle', color: '#e74c3c' };

      case 'CRASH':
        return { name: 'alert-triangle', color: '#f39c12' };

      case 'CRASH_CANCELLED': // ✅ ADDED FIX
        return { name: 'x-circle', color: '#6b7280' };

      case 'DRIVING_ON':
        return { name: 'navigation', color: '#2ecc71' };

      case 'DRIVING_OFF':
        return { name: 'square', color: '#95a5a6' };

      case 'ADMIN_ACCEPTED':
        return { name: 'check-circle', color: '#27ae60' };

      default:
        return { name: 'info', color: '#4C6EF5' };
    }
  };

  /* ---------------- RENDER ITEM ---------------- */
  const renderItem = ({ item }: { item: HistoryEvent }) => {
    const icon = getIcon(item.type);

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Icon name={icon.name} size={20} color={icon.color} />
          <Text style={styles.typeText}>{item.type}</Text>
        </View>

        <Text style={styles.description}>
          {item.description || 'No description'}
        </Text>

        {/* OPTIONAL DETAILS */}
        {item.speed !== undefined && (
          <Text style={styles.detail}>🚗 Speed: {item.speed} km/h</Text>
        )}

        {item.latitude !== undefined && item.longitude !== undefined && (
          <Text style={styles.detail}>
            📍 {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </Text>
        )}

        <Text style={styles.date}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>History</Text>

        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Icon name="trash-2" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* LOADING */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#e74c3c"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.id ?? index.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#e74c3c']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="clock" size={40} color="#ccc" />
              <Text style={styles.emptyText}>No history yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },

  clearButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 10,
  },

  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 2,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  typeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },

  description: {
    fontSize: 15,
    marginTop: 6,
    color: '#333',
  },

  detail: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },

  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
});