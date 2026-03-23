import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
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

  // Load history from storage
  const loadHistory = async () => {
    try {
      const data = await getHistoryEvents();
      data.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(data);
    } catch (error) {
      console.log('Error loading history:', error);
      setHistory([]);
    }
  };

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, []);

  // Clear all history
  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistoryStorage();
              setHistory([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  // Icon depending on event type
  const getIcon = (type: string) => {
    switch (type) {
      case 'SOS':
        return { name: 'alert-circle', color: '#e74c3c' };
      case 'CRASH':
        return { name: 'alert-triangle', color: '#f39c12' };
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

  // Render each item
  const renderItem = ({ item }: { item: HistoryEvent }) => {
    const icon = getIcon(item.type);

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Icon
            name={icon.name}
            size={20}
            color={icon.color}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.typeText}>
            [{item.type}] {item.description || '-'}
          </Text>
        </View>

        {item.speed !== undefined && (
          <Text style={styles.detail}>Speed: {item.speed} km/h</Text>
        )}

        {item.latitude !== undefined && item.longitude !== undefined && (
          <Text style={styles.detail}>
            Location: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </Text>
        )}

        <Text style={styles.date}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>History</Text>

        <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
          <Icon
            name="trash-2"
            size={16}
            color="#e74c3c"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
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
          <Text style={styles.emptyText}>No history available yet</Text>
        }
      />
    </View>
  );
}

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
    paddingHorizontal: 8,
  },

  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },

  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  clearButtonText: {
    color: '#e74c3c',
    fontWeight: '600',
    fontSize: 14,
  },

  item: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  typeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },

  detail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },

  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 16,
  },
});