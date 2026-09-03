import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';

const MESH_CACHE_KEY = '@mesh_seen_cache';
const MESH_ALERTS_KEY = '@mesh_alerts';
const MESH_TTL_MAX = 5;

class MeshService {
  constructor() {
    this.seenCache = new Set();
    this.isAdvertising = false;
    this.nativeModule = null;
    this.messageListeners = [];
    this.subscription = null;
  }

  async init() {
    await this.loadSeenCache();
    this.loadNativeModule();
    this.setupNativeListener();
  }

  loadNativeModule() {
    if (Platform.OS !== 'android') return;
    try {
      this.nativeModule = NativeModules.NearbyConnectionsModule;
    } catch (e) {
      console.warn('Nearby Connections module not loaded. Mesh relay requires a bare workflow Android build.', e);
    }
  }

  setupNativeListener() {
    if (this.subscription) return;

    this.subscription = DeviceEventEmitter.addListener('onMessageReceived', (rawMessage) => {
      this.handleIncomingMessage(rawMessage).then((msg) => {
        if (msg) {
          this.messageListeners.forEach((cb) => cb(msg));
        }
      });
    });
  }

  addMessageListener(cb) {
    this.messageListeners.push(cb);
    return () => {
      this.messageListeners = this.messageListeners.filter((listener) => listener !== cb);
    };
  }

  async loadSeenCache() {
    try {
      const cached = await AsyncStorage.getItem(MESH_CACHE_KEY);
      if (cached) {
        this.seenCache = new Set(JSON.parse(cached));
      }
    } catch (e) {
      console.warn('Failed to load mesh seen cache', e);
    }
  }

  async persistSeenCache() {
    try {
      const ids = Array.from(this.seenCache).slice(-500);
      await AsyncStorage.setItem(MESH_CACHE_KEY, JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to persist mesh seen cache', e);
    }
  }

  isSeen(msgId) {
    return this.seenCache.has(msgId);
  }

  markSeen(msgId) {
    this.seenCache.add(msgId);
    this.persistSeenCache();
  }

  async loadCachedAlerts() {
    try {
      const raw = await AsyncStorage.getItem(MESH_ALERTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  async persistCachedAlerts(alerts) {
    try {
      await AsyncStorage.setItem(MESH_ALERTS_KEY, JSON.stringify(alerts.slice(-200)));
    } catch (e) {
      console.warn('Failed to persist mesh alerts', e);
    }
  }

  async getLocalAlerts() {
    return this.loadCachedAlerts();
  }

  async addLocalAlert(message) {
    if (this.seenCache.has(message.msg_id)) {
      return null;
    }

    this.markSeen(message.msg_id);
    const alerts = await this.loadCachedAlerts();
    const entry = { ...message, received_via_mesh: true };
    alerts.unshift(entry);
    await this.persistCachedAlerts(alerts);
    return entry;
  }

  async ingestFromApi(apiAlert, regionName) {
    const msgId = `api-${apiAlert.id}-${apiAlert.timestamp}`;
    if (this.seenCache.has(msgId)) return null;

    const message = {
      zone_code: regionName,
      risk_tier: apiAlert.risk_level,
      timestamp: apiAlert.timestamp,
      ttl: MESH_TTL_MAX,
      msg_id: msgId,
      short_text: apiAlert.reason,
      received_via_mesh: false,
    };

    this.markSeen(message.msg_id);
    const alerts = await this.loadCachedAlerts();
    alerts.unshift(message);
    await this.persistCachedAlerts(alerts);
    return message;
  }

  startAdvertising() {
    if (!this.nativeModule) return;
    try {
      this.nativeModule.startAdvertising({ ttl: MESH_TTL_MAX });
      this.isAdvertising = true;
    } catch (e) {
      console.warn('Failed to start mesh advertising', e);
    }
  }

  stopAdvertising() {
    if (!this.nativeModule) return;
    try {
      this.nativeModule.stopAdvertising();
    } catch (e) {
      console.warn('Failed to stop mesh advertising', e);
    }
    this.isAdvertising = false;
  }

  startDiscovery() {
    if (!this.nativeModule) return;
    try {
      this.nativeModule.startDiscovery();
    } catch (e) {
      console.warn('Failed to start mesh discovery', e);
    }
  }

  stopDiscovery() {
    if (!this.nativeModule) return;
    try {
      this.nativeModule.stopDiscovery();
    } catch (e) {
      console.warn('Failed to stop mesh discovery', e);
    }
  }

  async handleIncomingMessage(rawMessage) {
    try {
      const message = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage;
      if (this.seenCache.has(message.msg_id)) return null;
      if (message.ttl <= 0) return null;

      const entry = await this.addLocalAlert(message);
      if (!entry) return null;

      if (message.ttl > 1) {
        this.relayMessage({ ...entry, ttl: entry.ttl - 1 });
      }
      return entry;
    } catch (e) {
      console.warn('Failed to handle incoming mesh message', e);
      return null;
    }
  }

  relayMessage(message) {
    if (!this.nativeModule) return;
    try {
      this.nativeModule.sendMessage(JSON.stringify(message));
    } catch (e) {
      console.warn('Failed to relay mesh message', e);
    }
  }

  async postMeshAlertsToBackend(apiPost) {
    const alerts = await this.loadCachedAlerts();
    const meshAlerts = alerts.filter((alert) => alert.received_via_mesh);

    for (const alert of meshAlerts.slice(0, 10)) {
      try {
        await apiPost({
          region_name: alert.zone_code,
          risk_level: alert.risk_tier,
          reason: alert.short_text,
          timestamp: alert.timestamp,
        });
      } catch (e) {
        console.warn('Failed to post mesh alert to backend', e);
      }
    }
  }
}

export const meshService = new MeshService();
