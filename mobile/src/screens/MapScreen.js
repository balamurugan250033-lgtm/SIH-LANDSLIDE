import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

let MapView, Marker, Callout;
if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
    Callout = Maps.Callout;
  } catch (e) {
    console.warn('Failed to load react-native-maps natively:', e);
  }
}

export default function MapScreen({ regions, riskStatuses }) {
  const [selectedRegion, setSelectedRegion] = useState(null);

  // Region location markers
  const getMarkerColor = (regionId) => {
    const status = riskStatuses[regionId];
    const riskLevel = status && status.current_alert ? status.current_alert.risk_level : 'LOW';
    
    if (riskLevel === 'CRITICAL') return '#EF4444'; // Red
    if (riskLevel === 'HIGH') return '#F97316'; // Orange
    if (riskLevel === 'MODERATE') return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  // Initial region (defaults to center of India or first region)
  const initialRegion = regions.length > 0
    ? {
        latitude: regions[0].latitude,
        longitude: regions[0].longitude,
        latitudeDelta: 8.0,
        longitudeDelta: 8.0,
      }
    : {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 15.0,
        longitudeDelta: 15.0,
      };

  const renderWebMockMap = () => {
    return (
      <View style={styles.webMapContainer}>
        <View style={styles.webSidebar}>
          <Text style={styles.sidebarTitle}>GIS Monitor Panel</Text>
          <Text style={styles.sidebarSubtitle}>Interactive Satellite Mapping (Web Simulation)</Text>
          
          <FlatList
            data={regions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const status = riskStatuses[item.id] || { current_alert: null, data_status: 'UNAVAILABLE' };
              const riskLevel = status.current_alert ? status.current_alert.risk_level : 'LOW';
              const markerColor = getMarkerColor(item.id);
              const isSelected = selectedRegion && selectedRegion.id === item.id;

              return (
                <TouchableOpacity
                  style={[styles.webRegionItem, isSelected && styles.webRegionItemSelected]}
                  onPress={() => setSelectedRegion(item)}
                >
                  <View style={styles.webRegionHeader}>
                    <View style={[styles.colorIndicator, { backgroundColor: markerColor }]} />
                    <Text style={styles.webRegionName}>{item.name}</Text>
                  </View>
                  <Text style={styles.webCoordinates}>
                    Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}
                  </Text>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.riskLabel, { color: markerColor }]}>{riskLevel} RISK</Text>
                    <Text style={styles.dataStatusLabel}>Status: {status.data_status}</Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={styles.webVisualGrid}>
          {selectedRegion ? (
            <View style={styles.detailPanel}>
              <Feather name="map-pin" size={32} color={getMarkerColor(selectedRegion.id)} style={{ marginBottom: 12 }} />
              <Text style={styles.detailTitle}>{selectedRegion.name}</Text>
              <Text style={styles.detailCoordinates}>
                LATITUDE: {selectedRegion.latitude.toFixed(6)} | LONGITUDE: {selectedRegion.longitude.toFixed(6)}
              </Text>
              
              <View style={styles.detailMetricsGrid}>
                <View style={styles.detailMetricBox}>
                  <Text style={styles.detailMetricValue}>
                    {riskStatuses[selectedRegion.id]?.latest_observation?.rainfall_mm?.toFixed(1) || '0.0'} mm
                  </Text>
                  <Text style={styles.detailMetricLabel}>Rainfall</Text>
                </View>
                <View style={styles.detailMetricBox}>
                  <Text style={styles.detailMetricValue}>
                    {riskStatuses[selectedRegion.id]?.latest_observation?.soil_moisture_percent?.toFixed(0) || '0'}%
                  </Text>
                  <Text style={styles.detailMetricLabel}>Soil Moisture</Text>
                </View>
                <View style={styles.detailMetricBox}>
                  <Text style={styles.detailMetricValue}>
                    {riskStatuses[selectedRegion.id]?.latest_observation?.slope_angle?.toFixed(1) || '0.0'}°
                  </Text>
                  <Text style={styles.detailMetricLabel}>Slope</Text>
                </View>
              </View>

              {riskStatuses[selectedRegion.id]?.current_alert && (
                <View style={styles.detailAlertBox}>
                  <Feather name="alert-triangle" size={16} color="#991B1B" style={{ marginRight: 8 }} />
                  <Text style={styles.detailAlertText}>
                    {riskStatuses[selectedRegion.id].current_alert.reason}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.webPlaceholderContainer}>
              <Feather name="map" size={48} color="#94A3B8" style={{ marginBottom: 16 }} />
              <Text style={styles.webPlaceholderText}>Select a region from the sidebar to view local GIS indicators.</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderNativeMap = () => {
    if (!MapView) {
      return (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackTitle}>Map library unavailable</Text>
          <Text style={styles.fallbackText}>Use the web app or a development build for full GIS maps.</Text>
          <FlatList
            data={regions}
            keyExtractor={(item) => item.id.toString()}
            style={styles.fallbackList}
            renderItem={({ item }) => {
              const status = riskStatuses[item.id] || { current_alert: null, latest_observation: null, data_status: 'UNAVAILABLE' };
              const riskLevel = status.current_alert ? status.current_alert.risk_level : 'LOW';
              return (
                <TouchableOpacity style={styles.fallbackItem} onPress={() => setSelectedRegion(item)}>
                  <Text style={styles.fallbackItemTitle}>{item.name}</Text>
                  <Text style={styles.fallbackItemSubtitle}>{riskLevel} Risk · {status.data_status}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      );
    }

    return (
      <MapView style={styles.map} initialRegion={initialRegion}>
        {regions.map((region) => {
          const status = riskStatuses[region.id] || { current_alert: null, latest_observation: null, data_status: 'UNAVAILABLE' };
          const riskLevel = status.current_alert ? status.current_alert.risk_level : 'LOW';
          const markerColor = getMarkerColor(region.id);

          return (
            <Marker
              key={region.id}
              coordinate={{ latitude: region.latitude, longitude: region.longitude }}
              title={region.name}
              description={`${riskLevel} Risk`}
              pinColor={markerColor}
            >
              <Callout>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>{region.name}</Text>
                  <Text style={styles.calloutSubtitle}>{riskLevel} Risk Level</Text>
                  {status.latest_observation && (
                    <Text style={styles.calloutBody}>
                      Rain: {status.latest_observation.rainfall_mm?.toFixed(1)}mm | Soil: {status.latest_observation.soil_moisture_percent?.toFixed(0)}%
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? renderWebMockMap() : renderNativeMap()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height - 120,
  },
  fallbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  fallbackText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  fallbackList: {
    width: '100%',
    maxHeight: 400,
  },
  fallbackItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  fallbackItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  fallbackItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  calloutContainer: {
    padding: 6,
    width: 180,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#0F172A',
  },
  calloutSubtitle: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  calloutBody: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
  },
  // Web specific mock styling
  webMapContainer: {
    flexDirection: 'row',
    flex: 1,
    height: '100%',
  },
  webSidebar: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    padding: 16,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  sidebarSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 16,
  },
  webRegionItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  webRegionItemSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  webRegionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  webRegionName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  webCoordinates: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dataStatusLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  webVisualGrid: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  webPlaceholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webPlaceholderText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailCoordinates: {
    fontSize: 10,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 20,
  },
  detailMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  detailMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  detailMetricLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  detailAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    width: '100%',
  },
  detailAlertText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '500',
  },
});
