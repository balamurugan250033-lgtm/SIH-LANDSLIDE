import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../services/api';

export default function RoadStatusScreen({ regions }) {
  const [roads, setRoads] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRoads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/citizen/road-statuses');
      setRoads(res.data);
    } catch (e) {
      console.warn('Failed to load road statuses', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoads();
  }, []);

  const getRegionName = (regionId) => {
    const region = regions.find((r) => r.id === regionId);
    return region ? region.name : `Region #${regionId}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'blocked': return '#DC2626';
      case 'at_risk': return '#D97706';
      default: return '#16A34A';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'blocked': return '#FEE2E2';
      case 'at_risk': return '#FEF3C7';
      default: return '#DCFCE7';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Road & Connectivity</Text>
        <Text style={styles.headerSubtitle}>Live corridor status for NER routes</Text>
      </View>
      <FlatList
        data={roads}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadRoads} tintColor="#2563EB" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No road status updates available</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = getStatusColor(item.status);
          const statusBg = getStatusBg(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.roadName}>{item.road_name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {item.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.regionName}>{getRegionName(item.region_id)}</Text>
              {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
              {item.alternative_route ? (
                <View style={styles.altRow}>
                  <Feather name="navigation" size={14} color="#2563EB" />
                  <Text style={styles.altText}>Alt route: {item.alternative_route}</Text>
                </View>
              ) : null}
              <Text style={styles.updated}>
                Updated {new Date(item.updated_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
              </Text>
            </View>
          );
        }}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  roadName: { fontSize: 14, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 9999 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  regionName: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  reason: { fontSize: 13, color: '#334155', marginBottom: 6 },
  altRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  altText: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginLeft: 6 },
  updated: { fontSize: 11, color: '#94A3B8' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: '#94A3B8', marginTop: 12 },
});
