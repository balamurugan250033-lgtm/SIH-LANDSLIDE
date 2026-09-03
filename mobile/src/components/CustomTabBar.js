import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function CustomTabBar({ activeTab, onTabPress, queuedCount }) {
  const tabs = [
    { id: 'home', icon: 'grid', label: 'Home' },
    { id: 'map', icon: 'map', label: 'GIS' },
    { id: 'alerts', icon: 'bell', label: 'Alerts' },
    { id: 'notifications', icon: 'message-square', label: 'Notices' },
    { id: 'roads', icon: 'navigation', label: 'Roads' },
    { id: 'evacuation', icon: 'flag', label: 'Routes' },
    { id: 'report', icon: 'edit-3', label: 'Report' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => onTabPress(tab.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                <Feather
                  name={tab.icon}
                  size={20}
                  color={isActive ? '#2563EB' : '#64748B'}
                />
                {tab.id === 'report' && queuedCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{queuedCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: 20,
    paddingTop: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: width,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  iconWrapper: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeIconWrapper: {
    backgroundColor: '#EFF6FF',
  },
  label: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },
  activeLabel: {
    color: '#2563EB',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
});
