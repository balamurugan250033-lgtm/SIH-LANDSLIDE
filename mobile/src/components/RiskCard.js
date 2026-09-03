import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DataStatusBadge from './DataStatusBadge';

export default function RiskCard({ region, riskStatus, onPress }) {
  const safeRiskStatus = riskStatus || {};
  const { current_alert, latest_observation, data_status = 'UNAVAILABLE' } = safeRiskStatus;

  
  const riskLevel = current_alert ? current_alert.risk_level : 'LOW';
  const riskScore = current_alert ? current_alert.risk_score : 0.05;

  let riskColor = '#10B981'; // LOW = green
  let bgLightColor = '#E6F4EA';
  
  if (riskLevel === 'MODERATE') {
    riskColor = '#F59E0B'; // Amber
    bgLightColor = '#FEF3C7';
  } else if (riskLevel === 'HIGH') {
    riskColor = '#F97316'; // Orange
    bgLightColor = '#FFEDD5';
  } else if (riskLevel === 'CRITICAL') {
    riskColor = '#EF4444'; // Red
    bgLightColor = '#FEE2E2';
  } else if (riskLevel === 'SEVERE') {
    riskColor = '#7F1D1D'; // Dark red
    bgLightColor = '#FEF2F2';
  }

  // Extract observation variables
  const rainfall = latest_observation && latest_observation.rainfall_mm !== null
    ? `${latest_observation.rainfall_mm.toFixed(1)} mm`
    : 'N/A';
  const moisture = latest_observation && latest_observation.soil_moisture_percent !== null
    ? `${latest_observation.soil_moisture_percent.toFixed(0)}%`
    : 'N/A';
  const slope = latest_observation && latest_observation.slope_angle !== null
    ? `${latest_observation.slope_angle.toFixed(1)}°`
    : 'N/A';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.cardHeader}>
        <View style={styles.regionInfo}>
          <Text style={styles.regionName}>{region.name}</Text>
          <Text style={styles.regionCoordinates}>
            Lat: {region.latitude.toFixed(4)}, Lon: {region.longitude.toFixed(4)}
          </Text>
        </View>
        <DataStatusBadge status={data_status} />
      </View>

      <View style={[styles.riskSection, { backgroundColor: bgLightColor }]}>
        <View style={styles.riskBadgeContainer}>
          <Feather name="shield" size={16} color={riskColor} style={styles.shieldIcon} />
          <Text style={[styles.riskLevelText, { color: riskColor }]}>
            {riskLevel} RISK
          </Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreLabel}>ML Score:</Text>
          <Text style={[styles.scoreValue, { color: riskColor }]}>
            {riskScore ? riskScore.toFixed(2) : '0.00'}
          </Text>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricItem}>
          <View style={styles.metricIconCircle}>
            <Feather name="cloud-rain" size={16} color="#2563EB" />
          </View>
          <Text style={styles.metricLabel}>Rainfall</Text>
          <Text style={styles.metricValue}>{rainfall}</Text>
        </View>

        <View style={[styles.metricItem, styles.borderLeftRight]}>
          <View style={styles.metricIconCircle}>
            <Feather name="droplet" size={16} color="#0EA5E9" />
          </View>
          <Text style={styles.metricLabel}>Soil Moisture</Text>
          <Text style={styles.metricValue}>{moisture}</Text>
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricIconCircle}>
            <Feather name="trending-up" size={16} color="#F97316" />
          </View>
          <Text style={styles.metricLabel}>Slope Angle</Text>
          <Text style={styles.metricValue}>{slope}</Text>
        </View>
      </View>

      {current_alert && (
        <View style={styles.alertBanner}>
          <Feather name="alert-triangle" size={12} color="#991B1B" style={styles.alertIcon} />
          <Text style={styles.alertText} numberOfLines={1}>
            {current_alert.reason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  regionInfo: {
    flex: 1,
    marginRight: 8,
  },
  regionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  regionCoordinates: {
    fontSize: 11,
    color: '#64748B',
  },
  riskSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  riskBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    marginRight: 6,
  },
  riskLevelText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#475569',
    marginRight: 4,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  borderLeftRight: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  alertIcon: {
    marginRight: 6,
  },
  alertText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '500',
  },
});
