import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AlertItem from '../components/AlertItem';
import { meshService } from '../services/mesh';

export default function AlertsScreen({ alerts, regions }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [meshAlerts, setMeshAlerts] = React.useState([]);

  const getRegionName = (regionId) => {
    const region = regions.find((r) => r.id === regionId);
    return region ? region.name : `Region #${regionId}`;
  };

  const filteredAlerts = alerts.filter((alert) => {
    const regName = getRegionName(alert.region_id).toLowerCase();
    const reasonText = alert.reason.toLowerCase();
    const query = searchQuery.toLowerCase();
    return regName.includes(query) || reasonText.includes(query);
  });

  const loadMeshAlerts = async () => {
    const cached = await meshService.getLocalAlerts();
    setMeshAlerts(cached);
  };

  useEffect(() => {
    loadMeshAlerts();
    const interval = setInterval(loadMeshAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const allAlerts = [...filteredAlerts, ...meshAlerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Warning Feed</Text>
        <Text style={styles.subtitle}>Live alerts and mesh-relayed warnings</Text>
      </View>
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter alerts by region or indicator..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Feather
            name="x"
            size={16}
            color="#64748B"
            onPress={() => setSearchQuery('')}
            style={{ padding: 4 }}
          />
        )}
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    const isMesh = !!item.received_via_mesh;
    const regionName = getRegionName(item.region_id);
    return (
      <View style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleRow}>
            <Feather name="alert-triangle" size={18} color="#DC2626" />
            <Text style={styles.alertTitle}>{item.risk_level} RISK</Text>
          </View>
          {isMesh && (
            <View style={styles.meshTag}>
              <Feather name="radio" size={12} color="#2563EB" />
              <Text style={styles.meshText}>Mesh</Text>
            </View>
          )}
        </View>
        <Text style={styles.alertRegion}>{regionName}</Text>
        <Text style={styles.alertReason}>{item.reason || item.short_text}</Text>
        <Text style={styles.alertTime}>
          {new Date(item.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={allAlerts}
        keyExtractor={(item, index) => `${item.id || item.msg_id}-${index}`}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadMeshAlerts} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="bell-off" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No alerts matching search' : 'No warnings logged'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 8 },
  titleContainer: { paddingVertical: 12, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', height: '100%' },
  alertCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertTitle: { fontSize: 14, fontWeight: 'bold', color: '#DC2626' },
  meshTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  meshText: { fontSize: 10, color: '#2563EB', fontWeight: '600', marginLeft: 4 },
  alertRegion: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  alertReason: { fontSize: 13, color: '#334155', marginBottom: 6 },
  alertTime: { fontSize: 11, color: '#94A3B8' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: '#94A3B8', marginTop: 12 },
});
