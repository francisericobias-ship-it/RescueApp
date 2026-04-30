// HistoryScreen.tsx - Modern Emergency History UI

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
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import {
  getHistoryEvents,
  clearHistory as clearHistoryStorage,
  HistoryEvent,
} from '../services/historyStorage';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  const isMounted = useRef(true);

  /* ---------------- FILTER OPTIONS ---------------- */
  const filterOptions = [
    { label: 'All', value: 'all' },
    { label: 'SOS', value: 'SOS' },
    { label: 'Crash', value: 'CRASH' },
    { label: 'Driving', value: 'DRIVING' },
  ];

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
      'This will permanently delete all emergency records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistoryStorage();
              setHistory([]);
              Alert.alert('Success', 'History cleared successfully');
            } catch {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  /* ---------------- GET FILTERED HISTORY ---------------- */
  const getFilteredHistory = () => {
    if (filterType === 'all') return history;
    if (filterType === 'DRIVING') {
      return history.filter(item => 
        item.type === 'DRIVING_ON' || item.type === 'DRIVING_OFF'
      );
    }
    return history.filter(item => item.type === filterType);
  };

  /* ---------------- GET ICON & STYLES ---------------- */
  const getEventDetails = (type: string) => {
    switch (type) {
      case 'SOS':
        return { 
          name: 'alert-circle', 
          color: '#FF3B30', 
          bgColor: '#FF3B3015',
          label: 'Emergency SOS',
          iconBg: '#FF3B3020'
        };
      case 'CRASH':
        return { 
          name: 'alert-triangle', 
          color: '#FF9F0A', 
          bgColor: '#FF9F0A15',
          label: 'Crash Detected',
          iconBg: '#FF9F0A20'
        };
      case 'CRASH_CANCELLED':
        return { 
          name: 'x-circle', 
          color: '#8E8E93', 
          bgColor: '#8E8E9315',
          label: 'Cancelled',
          iconBg: '#8E8E9320'
        };
      case 'DRIVING_ON':
        return { 
          name: 'navigation', 
          color: '#34C759', 
          bgColor: '#34C75915',
          label: 'Driving Started',
          iconBg: '#34C75920'
        };
      case 'DRIVING_OFF':
        return { 
          name: 'square', 
          color: '#8E8E93', 
          bgColor: '#8E8E9315',
          label: 'Driving Ended',
          iconBg: '#8E8E9320'
        };
      case 'ADMIN_ACCEPTED':
        return { 
          name: 'check-circle', 
          color: '#34C759', 
          bgColor: '#34C75915',
          label: 'Response Accepted',
          iconBg: '#34C75920'
        };
      default:
        return { 
          name: 'info', 
          color: '#007AFF', 
          bgColor: '#007AFF15',
          label: type,
          iconBg: '#007AFF20'
        };
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  /* ---------------- RENDER FILTER BUTTONS ---------------- */
  const renderFilterButtons = () => (
    <View style={styles.filterContainer}>
      {filterOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.filterButton,
            filterType === option.value && styles.filterButtonActive,
          ]}
          onPress={() => setFilterType(option.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterType === option.value && styles.filterButtonTextActive,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  /* ---------------- RENDER HISTORY ITEM ---------------- */
  const renderItem = ({ item }: { item: HistoryEvent }) => {
    const details = getEventDetails(item.type);
    const timeAgo = formatDate(item.timestamp);

    return (
      <View style={[styles.itemCard, { borderLeftColor: details.color, borderLeftWidth: 4 }]}>
        <View style={styles.itemHeader}>
          <View style={[styles.iconContainer, { backgroundColor: details.iconBg }]}>
            <Icon name={details.name} size={22} color={details.color} />
          </View>
          <View style={styles.itemHeaderContent}>
            <Text style={[styles.typeText, { color: details.color }]}>
              {details.label}
            </Text>
            <Text style={styles.timeText}>{timeAgo}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="more-vertical" size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        <View style={styles.detailsContainer}>
          {item.speed !== undefined && (
            <View style={styles.detailBadge}>
              <Icon name="gauge" size={12} color="#8E8E93" />
              <Text style={styles.detailText}>Speed: {item.speed} km/h</Text>
            </View>
          )}

          {item.latitude !== undefined && item.longitude !== undefined && (
            <View style={styles.detailBadge}>
              <Icon name="map-pin" size={12} color="#8E8E93" />
              <Text style={styles.detailText}>
                {item.latitude.toFixed(4)}°, {item.longitude.toFixed(4)}°
              </Text>
            </View>
          )}

          {item.type === 'CRASH' && item.description?.includes('Impact') && (
            <View style={[styles.detailBadge, styles.impactBadge]}>
              <Icon name="zap" size={12} color="#FF9F0A" />
              <Text style={[styles.detailText, { color: '#FF9F0A' }]}>
                Impact detected
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.fullDateText}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    );
  };

  const filteredHistory = getFilteredHistory();

  /* ---------------- UI RENDER ---------------- */
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F2F2F7" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSubtitle}>
              {filteredHistory.length} {filteredHistory.length === 1 ? 'event' : 'events'} recorded
            </Text>
          </View>
          {history.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
              <Icon name="trash-2" size={18} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Buttons */}
        {history.length > 0 && renderFilterButtons()}

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF3B30" />
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item, index) => item.id ?? index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF3B30']}
                tintColor="#FF3B30"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="clock" size={48} color="#C6C6C8" />
                </View>
                <Text style={styles.emptyTitle}>No history yet</Text>
                <Text style={styles.emptySubtitle}>
                  {filterType !== 'all' 
                    ? `No ${filterType.toLowerCase()} events found` 
                    : 'Emergency events will appear here'}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF3B3015',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#FF3B30',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemHeaderContent: {
    flex: 1,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
  },
  description: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  impactBadge: {
    backgroundColor: '#FF9F0A15',
  },
  detailText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  fullDateText: {
    fontSize: 11,
    color: '#C6C6C8',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

// Add Platform import
import { Platform } from 'react-native';