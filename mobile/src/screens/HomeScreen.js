import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, Alert, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import RiskCard from '../components/RiskCard';
import DataStatusBadge from '../components/DataStatusBadge';

export default function HomeScreen({
  regions,
  riskStatuses,
  isOnline,
  isLoading,
  onRefresh,
  onSelectTab
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const totalRegions = regions.length;
  const severeCount = Object.values(riskStatuses).filter(
    (s) => s.current_alert && ['SEVERE', 'CRITICAL'].includes(s.current_alert.risk_level)
  ).length;
  const highCount = Object.values(riskStatuses).filter(
    (s) => s.current_alert && s.current_alert.risk_level === 'HIGH'
  ).length;
  const moderateCount = Object.values(riskStatuses).filter(
    (s) => s.current_alert && s.current_alert.risk_level === 'MODERATE'
  ).length;
  const activeAlertCount = severeCount + highCount + moderateCount;

  const filteredRegions = regions.filter((region) =>
    region.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Landslide Monitor</Text>
        <Text style={styles.subtitle}>NER Early Warning System</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalRegions}</Text>
          <Text style={styles.statLabel}>Zones</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, activeAlertCount > 0 && styles.statDanger]}>{activeAlertCount}</Text>
          <Text style={styles.statLabel}>Alerts</Text>
        </View>
        <View style={styles.statBox}>
          <DataStatusBadge status={isOnline ? 'LIVE' : 'OFFLINE'} />
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search region..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </View>
  );

  if (regions.length === 0 && !isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Feather name="map-pin" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No regions found</Text>
          <Text style={styles.emptyText}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={filteredRegions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <RiskCard
            region={item}
            riskStatus={riskStatuses[item.id]}
            onPress={() => onSelectTab && onSelectTab('map')}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#2563EB" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="search" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No regions match your search.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, paddingTop: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  titleContainer: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 12, marginHorizontal: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2, textTransform: 'uppercase', fontWeight: '600' },
  statDanger: { color: '#DC2626' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', paddingVertical: 0 },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#475569', marginTop: 12 },
  emptyText: { fontSize: 13, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
});
