import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function DataStatusBadge({ status }) {
  let badgeColor = '#64748B'; // Default slate
  let textColor = '#FFFFFF';
  let iconName = 'help-circle';
  let label = status || 'UNKNOWN';

  switch (status) {
    case 'LIVE':
      badgeColor = '#10B981'; // Emerald
      iconName = 'activity';
      label = 'LIVE SENSORS';
      break;
    case 'STALE':
      badgeColor = '#F59E0B'; // Amber
      iconName = 'clock';
      label = 'DATA STALE';
      break;
    case 'OFFLINE':
      badgeColor = '#EF4444'; // Red
      iconName = 'wifi-off';
      label = 'OFFLINE MODE';
      break;
    case 'UNAVAILABLE':
      badgeColor = '#64748B'; // Slate
      iconName = 'alert-circle';
      label = 'NO DATA';
      break;
  }

  return (
    <View style={[styles.badgeContainer, { backgroundColor: badgeColor }]}>
      <Feather name={iconName} size={13} color={textColor} style={styles.icon} />
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  icon: {
    marginRight: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
