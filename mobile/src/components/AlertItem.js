import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function AlertItem({ alert, regionName }) {
  const { risk_level, risk_score, timestamp, reason } = alert;
  
  // Format Date
  const date = new Date(timestamp);
  const formattedDate = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  let color = '#F59E0B'; // MODERATE
  let iconName = 'alert-triangle';
  let badgeBg = '#FEF3C7';

  if (risk_level === 'HIGH') {
    color = '#F97316';
    iconName = 'alert-octagon';
    badgeBg = '#FFEDD5';
  } else if (risk_level === 'CRITICAL') {
    color = '#EF4444';
    iconName = 'skull' in Feather.glyphMap ? 'skull' : 'alert-octagon'; // Fallback check
    if (iconName !== 'skull') {
      iconName = 'alert-circle';
    }
    badgeBg = '#FEE2E2';
  }

  return (
    <View style={styles.alertCard}>
      <View style={styles.header}>
        <View style={styles.regionInfo}>
          <Text style={styles.regionName}>{regionName || `Region #${alert.region_id}`}</Text>
          <Text style={styles.timestamp}>{formattedDate}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Feather name={iconName} size={12} color={color} style={styles.badgeIcon} />
          <Text style={[styles.badgeText, { color: color }]}>{risk_level}</Text>
        </View>
      </View>

      <Text style={styles.reason}>{reason}</Text>

      <View style={styles.footer}>
        <Text style={styles.scoreText}>ML Model Confidence:</Text>
        <Text style={[styles.scoreValue, { color: color }]}>{(risk_score * 100).toFixed(1)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  regionInfo: {
    flex: 1,
    marginRight: 8,
  },
  regionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  timestamp: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  reason: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  scoreText: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
