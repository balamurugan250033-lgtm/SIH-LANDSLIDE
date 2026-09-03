import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../services/api';

export default function EvacuationRoutesScreen({ regions }) {
  const [routes, setRoutes] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [nearestRoute, setNearestRoute] = React.useState(null);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/citizen/road-statuses');
      const openRoutes = res.data.filter((r) => r.status === 'open' || r.status === 'at_risk');
      setRoutes(openRoutes);
    } catch (e) {
      console.warn('Failed to load routes', e);
    } finally {
      setLoading(false);
    }
  };

  const findNearestRoute = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      let nearest = null;
      let minDist = Infinity;
      routes.forEach((route) => {
        const region = regions.find((r) => r.id === route.region_id);
        if (!region) return;
        const dist = Math.sqrt(
          Math.pow(location.coords.latitude - region.latitude, 2) +
            Math.pow(location.coords.longitude - region.longitude, 2)
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = { route, region, dist: dist * 111 };
        }
      });
      setNearestRoute(nearest);
    } catch (e) {
      console.warn('Location failed', e);
    }
  };

  React.useEffect(() => {
    loadRoutes();
  }, []);

  const getRegionName = (regionId) => {
    const region = regions.find((r) => r.id === regionId);
    return region ? region.name : `Region #${regionId}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Evacuation Routes</Text>
        <Text style={styles.headerSubtitle}>Safe corridors and alternate highways</Text>
      </View>
      <TouchableOpacity style={styles.locateButton} onPress={findNearestRoute}>
        <Feather name="navigation" size={18} color="#FFFFFF" />
        <Text style={styles.locateText}>Find Nearest Safe Route</Text>
      </TouchableOpacity>
      {nearestRoute && (
        <View style={styles.nearestCard}>
          <Text style={styles.nearestTitle}>Nearest Safe Route</Text>
          <Text style={styles.nearestRegion}>{nearestRoute.region.name}</Text>
          <Text style={styles.nearestDist}>Approx {nearestRoute.dist.toFixed(1)} km away</Text>
          <Text style={styles.nearestAlt}>{nearestRoute.route.alternative_route}</Text>
        </View>
      )}
      <FlatList
        data={routes}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadRoutes} tintColor="#2563EB" />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="navigation" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No safe routes listed yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="map-pin" size={16} color="#2563EB" />
              <Text style={styles.roadName}>{item.road_name}</Text>
            </View>
            <Text style={styles.regionName}>{getRegionName(item.region_id)}</Text>
            {item.alternative_route ? (
              <View style={styles.altRow}>
                <Feather name="corner-up-right" size={14} color="#16A34A" />
                <Text style={styles.altText}>{item.alternative_route}</Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, paddingTop: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  locateButton: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  locateText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8 },
  nearestCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  nearestTitle: { fontSize: 12, color: '#2563EB', fontWeight: '700', textTransform: 'uppercase' },
  nearestRegion: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginTop: 4 },
  nearestDist: { fontSize: 13, color: '#475569', marginTop: 4 },
  nearestAlt: { fontSize: 13, color: '#1D4ED8', fontWeight: '600', marginTop: 6 },
  listContent: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  roadName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginLeft: 8 },
  regionName: { fontSize: 12, color: '#64748B', marginBottom: 6 },
  altRow: { flexDirection: 'row', alignItems: 'center' },
  altText: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginLeft: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 13, color: '#94A3B8', marginTop: 12 },
});
