import { openDB } from 'idb';

const DB_NAME = 'LandslideWebDB';
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
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
};

export const idbService = {
  saveRegions: async (regions) => {
    if (!Array.isArray(regions)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('regions', 'readwrite');
      await Promise.all(regions.map((r) => tx.store.put(r)));
      await tx.done;
    } catch (e) {
      console.warn('idb saveRegions failed', e);
    }
  },

  getCachedRegions: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      return await db.getAll('regions');
    } catch (e) {
      return [];
    }
  },

  saveRiskStatuses: async (riskMap) => {
    if (!riskMap || typeof riskMap !== 'object') return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('risk_statuses', 'readwrite');
      for (const [regionId, data] of Object.entries(riskMap)) {
        await tx.store.put({ region_id: Number(regionId), data });
      }
      await tx.done;
    } catch (e) {
      console.warn('idb saveRiskStatuses failed', e);
    }
  },

  getCachedRiskStatuses: async () => {
    try {
      const db = await getDB();
      if (!db) return {};
      const rows = await db.getAll('risk_statuses');
      const res = {};
      rows.forEach((r) => {
        res[r.region_id] = r.data;
      });
      return res;
    } catch {
      return {};
    }
  },

  saveAlerts: async (alerts) => {
    if (!Array.isArray(alerts)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('alerts', 'readwrite');
      await Promise.all(alerts.map((a) => tx.store.put(a)));
      await tx.done;
    } catch (e) {
      console.warn('idb saveAlerts failed', e);
    }
  },

  getCachedAlerts: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      const alerts = await db.getAll('alerts');
      return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch {
      return [];
    }
  },

  saveReports: async (reports) => {
    if (!Array.isArray(reports)) return;
    try {
      const db = await getDB();
      if (!db) return;
      const tx = db.transaction('reports', 'readwrite');
      await Promise.all(reports.map((r) => tx.store.put(r)));
      await tx.done;
    } catch (e) {
      console.warn('idb saveReports failed', e);
    }
  },

  getCachedReports: async () => {
    try {
      const db = await getDB();
      if (!db) return [];
      const reports = await db.getAll('reports');
      return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch {
      return [];
    }
  },
};

