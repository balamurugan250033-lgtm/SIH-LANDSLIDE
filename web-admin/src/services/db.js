import { openDB } from 'idb';

const DB_NAME = 'LandslideAdminDB';
const DB_VERSION = 1;

let dbPromise = null;

export const getDB = async () => {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('regions')) {
          db.createObjectStore('regions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('risk_statuses')) {
          db.createObjectStore('risk_statuses', { keyPath: 'region_id' });
        }
        if (!db.objectStoreNames.contains('alerts')) {
          db.createObjectStore('alerts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('road_statuses')) {
          db.createObjectStore('road_statuses', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

export const idbService = {
  // ==================== REGIONS ====================
  saveRegions: async (regions) => {
    if (!Array.isArray(regions)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('regions', 'readwrite');
      await Promise.all(regions.map((r) => tx.store.put(r)));
      await tx.done;
      await idbService.setMeta('regions_last_synced', new Date().toISOString());
    } catch (e) {
      console.warn('IndexedDB saveRegions failed:', e);
    }
  },

  getCachedRegions: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      return await db.getAll('regions');
    } catch (e) {
      console.warn('IndexedDB getCachedRegions failed:', e);
      return [];
    }
  },

  // ==================== RISK STATUSES ====================
  saveRiskStatuses: async (riskMap) => {
    if (!riskMap || typeof riskMap !== 'object') return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('risk_statuses', 'readwrite');
      for (const [regionId, data] of Object.entries(riskMap)) {
        await tx.store.put({
          region_id: Number(regionId),
          data,
          updated_at: new Date().toISOString(),
        });
      }
      await tx.done;
    } catch (e) {
      console.warn('IndexedDB saveRiskStatuses failed:', e);
    }
  },

  getCachedRiskStatuses: async () => {
    try {
      const db = await getDB();
      if (!db) return {};
      const rows = await db.getAll('risk_statuses');
      const result = {};
      rows.forEach((r) => {
        result[r.region_id] = r.data;
      });
      return result;
    } catch (e) {
      console.warn('IndexedDB getCachedRiskStatuses failed:', e);
      return {};
    }
  },

  // ==================== ALERTS ====================
  saveAlerts: async (alerts) => {
    if (!Array.isArray(alerts)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('alerts', 'readwrite');
      await Promise.all(alerts.map((a) => tx.store.put(a)));
      await tx.done;
      await idbService.setMeta('alerts_last_synced', new Date().toISOString());
    } catch (e) {
      console.warn('IndexedDB saveAlerts failed:', e);
    }
  },

  getCachedAlerts: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      const alerts = await db.getAll('alerts');
      return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
      console.warn('IndexedDB getCachedAlerts failed:', e);
      return [];
    }
  },

  // ==================== REPORTS ====================
  saveReports: async (reports) => {
    if (!Array.isArray(reports)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('reports', 'readwrite');
      await Promise.all(reports.map((r) => tx.store.put(r)));
      await tx.done;
      await idbService.setMeta('reports_last_synced', new Date().toISOString());
    } catch (e) {
      console.warn('IndexedDB saveReports failed:', e);
    }
  },

  getCachedReports: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      const reports = await db.getAll('reports');
      return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
      console.warn('IndexedDB getCachedReports failed:', e);
      return [];
    }
  },

  // ==================== ROAD STATUSES ====================
  saveRoadStatuses: async (roads) => {
    if (!Array.isArray(roads)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('road_statuses', 'readwrite');
      await Promise.all(roads.map((r) => tx.store.put(r)));
      await tx.done;
    } catch (e) {
      console.warn('IndexedDB saveRoadStatuses failed:', e);
    }
  },

  getCachedRoadStatuses: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      return await db.getAll('road_statuses');
    } catch (e) {
      console.warn('IndexedDB getCachedRoadStatuses failed:', e);
      return [];
    }
  },

  // ==================== METADATA & LAST SYNC ====================
  setMeta: async (key, value) => {
    try {
      const db = await getDB();
      if (!db) return;
      await db.put('meta', { key, value });
    } catch (e) {
      console.warn('IndexedDB setMeta failed:', e);
    }
  },

  getMeta: async (key) => {
    try {
      const db = await getDB();
      if (!db) return null;
      const row = await db.get('meta', key);
      return row ? row.value : null;
    } catch (e) {
      return null;
    }
  },

  loadAllCachedData: async () => {
    const [regions, risk, alerts, reports, roads, lastSync] = await Promise.all([
      idbService.getCachedRegions(),
      idbService.getCachedRiskStatuses(),
      idbService.getCachedAlerts(),
      idbService.getCachedReports(),
      idbService.getCachedRoadStatuses(),
      idbService.getMeta('regions_last_synced'),
    ]);

    return {
      regions,
      risk,
      alerts,
      reports,
      roads,
      lastSync,
    };
  },
};

