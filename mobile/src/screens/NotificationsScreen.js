import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';
import { meshService } from '../services/mesh';

export default function NotificationsScreen({ regions }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const meshAlerts = await meshService.getLocalAlerts();
      let apiNotifs = [];
      try {
        const res = await api.get('/citizen/notifications');
        apiNotifs = res.data.map((n) => ({ ...n, received_via_mesh: false }));
      } catch (e) {
        console.warn('API notifications fetch failed, using cache only', e);
      }
      const combined = [...apiNotifs, ...meshAlerts].sort((a, b) => new Date(b.sent_at || b.timestamp) - new Date(a.sent_at || a.timestamp));
      setNotifications(combined);
    } catch (e) {
      console.warn('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (tier) => {
    switch (tier) {
      case 'SEVERE': return '#7F1D1D';
      case 'CRITICAL': return '#DC2626';
      case 'HIGH': return '#EA580C';
      case 'MODERATE': return '#D97706';
      default: return '#16A34A';
    }
  };

  const renderItem = ({ item }) => {
    const riskColor = getRiskColor(item.risk_tier || item.risk_level);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.riskBadge, { backgroundColor: `${riskColor}15` }]}>
            <Feather name="alert-triangle" size={14} color={riskColor} />
            <Text style={[styles.riskText, { color: riskColor }]}>
              {item.risk_tier || item.risk_level}
            </Text>
          </View>
          {item.received_via_mesh && (
            <View style={styles.meshTag}>
              <Feather name="radio" size={12} color="#2563EB" />
              <Text style={styles.meshText}>Received via mesh</Text>
            </View>
          )}
        </View>
        <Text style={styles.title}>{item.title || item.short_text || 'Landslide Alert'}</Text>
        <Text style={styles.zone}>{item.zone_code || `Region #${item.region_id}`}</Text>
        <Text style={styles.time}>
          {new Date(item.sent_at || item.timestamp).toLocaleString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            day: 'numeric',
            month: 'short',
          })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Official Notices</Text>
        <Text style={styles.headerSubtitle}>Government alerts and mesh-relayed warnings</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item, index) => `${item.id || item.msg_id}-${index}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadNotifications} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, paddingTop: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  riskText: { fontSize: 11, fontWeight: 'bold', marginLeft: 6, textTransform: 'uppercase' },
  meshTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  meshText: { fontSize: 10, color: '#2563EB', fontWeight: '600', marginLeft: 4 },
  title: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  zone: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  time: { fontSize: 11, color: '#94A3B8' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: '#94A3B8', marginTop: 12 },
});
