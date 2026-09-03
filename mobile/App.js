import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, StatusBar, Text, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { shouldInitPushNotifications } from './src/utils/pushNotifications';
import api from './src/services/api';
import { dbService } from './src/services/database';
import { syncService } from './src/services/sync';
import { meshService } from './src/services/mesh';
import CustomTabBar from './src/components/CustomTabBar';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import RoadStatusScreen from './src/screens/RoadStatusScreen';
import EvacuationRoutesScreen from './src/screens/EvacuationRoutesScreen';
import ReportScreen from './src/screens/ReportScreen';
import ProfileScreen from './src/screens/ProfileScreen';

let Notifications = null;

const shouldInitNotifications = shouldInitPushNotifications(Constants || {});

if (shouldInitNotifications) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [regions, setRegions] = useState([]);
  const [riskStatuses, setRiskStatuses] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [queuedCount, setQueuedCount] = useState(0);
  
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize SQLite database and load local cached entities on startup
  useEffect(() => {
    const bootstrap = async () => {
      await dbService.init();
      await loadCachedData();
      await checkQueuedCount();
      await fetchData();
      registerForPushNotifications();
      meshService.init();
    };

    bootstrap();
    return () => meshService.stopAdvertising();
  }, []);

  // Background Sync Routine: on app foreground or reconnect
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        meshService.init();
        // Trigger background sync routine: push pending local writes and pull server state
        await handleForegroundSync();

        if (!isOnline) {
          meshService.startAdvertising();
          meshService.startDiscovery();
        }
      } else {
        meshService.stopAdvertising();
        meshService.stopDiscovery();
      }
    });
    return () => subscription.remove();
  }, [isOnline, queuedCount]);

  useEffect(() => {
    if (isOnline) {
      meshService.postMeshAlertsToBackend(async (payload) => {
        await api.post('/admin/alerts', payload);
      });
    }
  }, [isOnline]);

  useEffect(() => {
    const removeListener = meshService.addMessageListener(async () => {
      await fetchData();
    });
    return removeListener;
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const shouldInit = shouldInitPushNotifications(Constants || {});
      if (!Notifications || !shouldInit) {
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return;
      }
      const token = await Notifications.getExpoPushTokenAsync();
      await AsyncStorage.setItem('push_token', token.data);
    } catch (e) {
      console.warn('Push notification setup skipped:', e);
    }
  };

  /**
   * Reads cached state immediately from local SQLite database
   */
  const loadCachedData = async () => {
    try {
      const cached = await syncService.loadLocalCache();
      if (cached.regions && cached.regions.length > 0) setRegions(cached.regions);
      if (cached.riskStatuses && Object.keys(cached.riskStatuses).length > 0) setRiskStatuses(cached.riskStatuses);
      if (cached.alerts && cached.alerts.length > 0) setAlerts(cached.alerts);
    } catch (e) {
      console.warn('Failed to load local SQLite cache:', e);
    }
  };

  const checkQueuedCount = async () => {
    try {
      const count = await syncService.getPendingCount();
      setQueuedCount(count);
    } catch (e) {
      console.error('Failed to get queued count from SQLite', e);
    }
  };

  /**
   * Fetches latest data from server and writes to local SQLite database cache
   */
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Regions
      const regionsRes = await api.get('/regions');
      const fetchedRegions = regionsRes.data || [];
      setRegions(fetchedRegions);
      await dbService.saveRegions(fetchedRegions);

      // 2. Fetch Risk Status per region
      const fetchedRiskStatuses = {};
      for (const reg of fetchedRegions) {
        try {
          const riskRes = await api.get(`/citizen/risk?region_id=${reg.id}`);
          fetchedRiskStatuses[reg.id] = riskRes.data;
        } catch (err) {
          fetchedRiskStatuses[reg.id] = {
            current_alert: null,
            latest_observation: null,
            data_status: 'UNAVAILABLE'
          };
        }
      }
      setRiskStatuses(fetchedRiskStatuses);
      await dbService.saveRiskStatuses(fetchedRiskStatuses);

      // 3. Fetch Alert logs
      const alertsRes = await api.get('/citizen/alerts');
      const fetchedAlerts = alertsRes.data || [];
      setAlerts(fetchedAlerts);
      await dbService.saveAlerts(fetchedAlerts);

      setIsOnline(true);
      
      // Auto-trigger sync if online and queued reports exist
      await handleSync();
    } catch (e) {
      console.log('Network unreachable. Operating from local SQLite database cache.', e);
      setIsOnline(false);
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    const count = await syncService.getPendingCount();
    if (count > 0) {
      await syncService.syncQueuedReports();
      await checkQueuedCount();
    }
  };

  const handleForegroundSync = async () => {
    try {
      // Push pending local writes (reports, mesh data)
      await handleSync();
      // Pull latest server state into local SQLite cache
      await fetchData();
    } catch (e) {
      console.warn('Foreground sync encountered issue:', e);
    }
  };

  /**
   * Handles hazard report submission:
   * Tries network first; if offline or network fails, queues into SQLite pending_reports table.
   */
  const handleQueueReport = async (reportData) => {
    if (isOnline) {
      try {
        const res = await api.post('/citizen/reports', reportData);
        if (res.data) {
          await dbService.saveCitizenReports([res.data]);
        }
        return { success: true, queued: false };
      } catch (err) {
        console.log('Failed to post report online, storing in SQLite pending_reports table', err);
      }
    }
    
    // Offline SQLite queue fallback
    const result = await syncService.queueReport(reportData);
    if (result.success) {
      await checkQueuedCount();
    }
    return result;
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            regions={regions}
            riskStatuses={riskStatuses}
            isOnline={isOnline}
            isLoading={isLoading}
            onRefresh={fetchData}
            onSelectTab={setActiveTab}
          />
        );
      case 'map':
        return <MapScreen regions={regions} riskStatuses={riskStatuses} />;
      case 'alerts':
        return <AlertsScreen alerts={alerts} regions={regions} />;
      case 'notifications':
        return <NotificationsScreen regions={regions} />;
      case 'roads':
        return <RoadStatusScreen regions={regions} />;
      case 'evacuation':
        return <EvacuationRoutesScreen regions={regions} />;
      case 'report':
        return (
          <ReportScreen
            regions={regions}
            isOnline={isOnline}
            queuedCount={queuedCount}
            onQueueReport={handleQueueReport}
            onSyncNow={handleSync}
          />
        );
      case 'profile':
        return <ProfileScreen />;
      default:
        return <View style={styles.contentPlaceholder} />;
    }
  };

  return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* Custom Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerDotRow}>
            <View style={[styles.networkDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
            <Text style={styles.headerTitle}>
              {isOnline ? 'GOVT. OF INDIA | LANDSLIDE PORTAL' : 'OFFLINE MODE | LOCAL SQLITE CACHE'}
            </Text>
          </View>
        </View>

        {/* Content Panel */}
        <View style={styles.content}>
          {renderActiveScreen()}
        </View>

        {/* Custom Bottom Tab Navigation */}
        <CustomTabBar
          activeTab={activeTab}
          onTabPress={setActiveTab}
          queuedCount={queuedCount}
        />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
    letterSpacing: 1.0,
  },
  content: {
    flex: 1,
  },
  contentPlaceholder: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});
