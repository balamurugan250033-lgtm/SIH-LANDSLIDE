let SQLite = null;
try {
  SQLite = require('expo-sqlite');
} catch (e) {
  // Fallback for non-native / test environments
}

class MobileDatabase {
  constructor() {
    this.db = null;
    this.memoryStore = {
      regions: new Map(),
      risk_statuses: new Map(),
      alerts: new Map(),
      citizen_reports: new Map(),
      pending_reports: [],
    };
    this.isNative = false;
    this.initialized = false;
    this._nextPendingId = 1;
  }

  async init() {
    if (this.initialized) return;

    if (SQLite && (typeof SQLite.openDatabaseSync === 'function' || typeof SQLite.openDatabaseAsync === 'function')) {
      try {
        if (typeof SQLite.openDatabaseSync === 'function') {
          this.db = SQLite.openDatabaseSync('landslide_early_warning.db');
        } else {
          this.db = await SQLite.openDatabaseAsync('landslide_early_warning.db');
        }
        this.isNative = true;
        await this.createTables();
        this.initialized = true;
        return;
      } catch (err) {
        console.warn('Native SQLite init failed, falling back to in-memory database:', err.message);
      }
    }

    this.isNative = false;
    this.initialized = true;
  }

  async createTables() {
    if (!this.isNative || !this.db) return;

    const queries = `
      CREATE TABLE IF NOT EXISTS regions (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS risk_statuses (
        region_id INTEGER PRIMARY KEY,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY,
        region_id INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score REAL,
        reason TEXT,
        timestamp TEXT NOT NULL,
        delivery_status TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS citizen_reports (
        id INTEGER PRIMARY KEY,
        region_id INTEGER NOT NULL,
        hazard_type TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        timestamp TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pending_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id INTEGER NOT NULL,
        hazard_type TEXT NOT NULL,
        description TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        media_path TEXT,
        created_at TEXT NOT NULL,
        sync_status TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0
      );
    `;

    try {
      if (typeof this.db.execAsync === 'function') {
        await this.db.execAsync(queries);
      } else if (typeof this.db.execSync === 'function') {
        this.db.execSync(queries);
      }
    } catch (e) {
      console.warn('Error creating SQLite tables:', e);
    }
  }

  // ==================== REGIONS ====================

  async saveRegions(regions) {
    await this.init();
    if (!Array.isArray(regions)) return;
    const now = new Date().toISOString();

    if (this.isNative && this.db) {
      try {
        for (const reg of regions) {
          if (typeof this.db.runAsync === 'function') {
            await this.db.runAsync(
              `INSERT OR REPLACE INTO regions (id, name, latitude, longitude, updated_at) VALUES (?, ?, ?, ?, ?)`,
              [reg.id, reg.name, reg.latitude, reg.longitude, now]
            );
          } else if (typeof this.db.runSync === 'function') {
            this.db.runSync(
              `INSERT OR REPLACE INTO regions (id, name, latitude, longitude, updated_at) VALUES (?, ?, ?, ?, ?)`,
              [reg.id, reg.name, reg.latitude, reg.longitude, now]
            );
          }
        }
        return;
      } catch (err) {
        console.warn('Failed to save regions to SQLite, caching in memory:', err);
      }
    }

    for (const reg of regions) {
      this.memoryStore.regions.set(reg.id, { ...reg, updated_at: now });
    }
  }

  async getRegions() {
    await this.init();
    if (this.isNative && this.db) {
      try {
        if (typeof this.db.getAllAsync === 'function') {
          return await this.db.getAllAsync(`SELECT id, name, latitude, longitude FROM regions ORDER BY id ASC`);
        } else if (typeof this.db.getAllSync === 'function') {
          return this.db.getAllSync(`SELECT id, name, latitude, longitude FROM regions ORDER BY id ASC`);
        }
      } catch (err) {
        console.warn('Failed to get regions from SQLite:', err);
      }
    }

    return Array.from(this.memoryStore.regions.values()).map(r => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude
    }));
  }

  // ==================== RISK STATUSES ====================

  async saveRiskStatuses(riskMap) {
    await this.init();
    if (!riskMap || typeof riskMap !== 'object') return;
    const now = new Date().toISOString();

    if (this.isNative && this.db) {
      try {
        for (const [regionId, riskData] of Object.entries(riskMap)) {
          const jsonStr = JSON.stringify(riskData);
          const rId = Number(regionId);
          if (typeof this.db.runAsync === 'function') {
            await this.db.runAsync(
              `INSERT OR REPLACE INTO risk_statuses (region_id, data_json, updated_at) VALUES (?, ?, ?)`,
              [rId, jsonStr, now]
            );
          } else if (typeof this.db.runSync === 'function') {
            this.db.runSync(
              `INSERT OR REPLACE INTO risk_statuses (region_id, data_json, updated_at) VALUES (?, ?, ?)`,
              [rId, jsonStr, now]
            );
          }
        }
        return;
      } catch (err) {
        console.warn('Failed to save risk statuses to SQLite:', err);
      }
    }

    for (const [regionId, riskData] of Object.entries(riskMap)) {
      this.memoryStore.risk_statuses.set(Number(regionId), riskData);
    }
  }

  async getRiskStatuses() {
    await this.init();
    const result = {};

    if (this.isNative && this.db) {
      try {
        let rows = [];
        if (typeof this.db.getAllAsync === 'function') {
          rows = await this.db.getAllAsync(`SELECT region_id, data_json FROM risk_statuses`);
        } else if (typeof this.db.getAllSync === 'function') {
          rows = this.db.getAllSync(`SELECT region_id, data_json FROM risk_statuses`);
        }
        for (const row of rows) {
          try {
            result[row.region_id] = JSON.parse(row.data_json);
          } catch {
            result[row.region_id] = row.data_json;
          }
        }
        return result;
      } catch (err) {
        console.warn('Failed to get risk statuses from SQLite:', err);
      }
    }

    for (const [regionId, val] of this.memoryStore.risk_statuses.entries()) {
      result[regionId] = val;
    }
    return result;
  }

  // ==================== ALERTS ====================

  async saveAlerts(alerts) {
    await this.init();
    if (!Array.isArray(alerts)) return;
    const now = new Date().toISOString();

    if (this.isNative && this.db) {
      try {
        for (const alert of alerts) {
          if (typeof this.db.runAsync === 'function') {
            await this.db.runAsync(
              `INSERT OR REPLACE INTO alerts (id, region_id, risk_level, risk_score, reason, timestamp, delivery_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [alert.id, alert.region_id, alert.risk_level, alert.risk_score || null, alert.reason || '', alert.timestamp, alert.delivery_status || 'sent', now]
            );
          } else if (typeof this.db.runSync === 'function') {
            this.db.runSync(
              `INSERT OR REPLACE INTO alerts (id, region_id, risk_level, risk_score, reason, timestamp, delivery_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [alert.id, alert.region_id, alert.risk_level, alert.risk_score || null, alert.reason || '', alert.timestamp, alert.delivery_status || 'sent', now]
            );
          }
        }
        return;
      } catch (err) {
        console.warn('Failed to save alerts to SQLite:', err);
      }
    }

    for (const alert of alerts) {
      this.memoryStore.alerts.set(alert.id, { ...alert, updated_at: now });
    }
  }

  async getAlerts() {
    await this.init();
    if (this.isNative && this.db) {
      try {
        if (typeof this.db.getAllAsync === 'function') {
          return await this.db.getAllAsync(`SELECT id, region_id, risk_level, risk_score, reason, timestamp, delivery_status FROM alerts ORDER BY timestamp DESC`);
        } else if (typeof this.db.getAllSync === 'function') {
          return this.db.getAllSync(`SELECT id, region_id, risk_level, risk_score, reason, timestamp, delivery_status FROM alerts ORDER BY timestamp DESC`);
        }
      } catch (err) {
        console.warn('Failed to get alerts from SQLite:', err);
      }
    }

    return Array.from(this.memoryStore.alerts.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // ==================== CITIZEN REPORTS (CACHED) ====================

  async saveCitizenReports(reports) {
    await this.init();
    if (!Array.isArray(reports)) return;
    const now = new Date().toISOString();

    if (this.isNative && this.db) {
      try {
        for (const report of reports) {
          if (typeof this.db.runAsync === 'function') {
            await this.db.runAsync(
              `INSERT OR REPLACE INTO citizen_reports (id, region_id, hazard_type, description, status, latitude, longitude, timestamp, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [report.id, report.region_id, report.hazard_type, report.description, report.status || 'Submitted', report.latitude || null, report.longitude || null, report.timestamp || now, now]
            );
          } else if (typeof this.db.runSync === 'function') {
            this.db.runSync(
              `INSERT OR REPLACE INTO citizen_reports (id, region_id, hazard_type, description, status, latitude, longitude, timestamp, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [report.id, report.region_id, report.hazard_type, report.description, report.status || 'Submitted', report.latitude || null, report.longitude || null, report.timestamp || now, now]
            );
          }
        }
        return;
      } catch (err) {
        console.warn('Failed to save citizen reports to SQLite:', err);
      }
    }

    for (const report of reports) {
      this.memoryStore.citizen_reports.set(report.id, { ...report, updated_at: now });
    }
  }

  async getCitizenReports() {
    await this.init();
    if (this.isNative && this.db) {
      try {
        if (typeof this.db.getAllAsync === 'function') {
          return await this.db.getAllAsync(`SELECT id, region_id, hazard_type, description, status, latitude, longitude, timestamp FROM citizen_reports ORDER BY timestamp DESC`);
        } else if (typeof this.db.getAllSync === 'function') {
          return this.db.getAllSync(`SELECT id, region_id, hazard_type, description, status, latitude, longitude, timestamp FROM citizen_reports ORDER BY timestamp DESC`);
        }
      } catch (err) {
        console.warn('Failed to get citizen reports from SQLite:', err);
      }
    }

    return Array.from(this.memoryStore.citizen_reports.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // ==================== PENDING REPORTS (OFFLINE QUEUE) ====================

  async queuePendingReport(reportData) {
    await this.init();
    const now = new Date().toISOString();
    const entry = {
      region_id: reportData.region_id,
      hazard_type: reportData.hazard_type,
      description: reportData.description,
      latitude: reportData.latitude || null,
      longitude: reportData.longitude || null,
      media_path: reportData.media_path || null,
      created_at: now,
      sync_status: 'pending',
      retry_count: 0
    };

    if (this.isNative && this.db) {
      try {
        let insertedId = null;
        if (typeof this.db.runAsync === 'function') {
          const res = await this.db.runAsync(
            `INSERT INTO pending_reports (region_id, hazard_type, description, latitude, longitude, media_path, created_at, sync_status, retry_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [entry.region_id, entry.hazard_type, entry.description, entry.latitude, entry.longitude, entry.media_path, entry.created_at, entry.sync_status, entry.retry_count]
          );
          insertedId = res.lastInsertRowId;
        } else if (typeof this.db.runSync === 'function') {
          const res = this.db.runSync(
            `INSERT INTO pending_reports (region_id, hazard_type, description, latitude, longitude, media_path, created_at, sync_status, retry_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [entry.region_id, entry.hazard_type, entry.description, entry.latitude, entry.longitude, entry.media_path, entry.created_at, entry.sync_status, entry.retry_count]
          );
          insertedId = res.lastInsertRowId;
        }
        return { success: true, queued: true, localId: insertedId };
      } catch (err) {
        console.warn('Failed to insert into pending_reports table:', err);
      }
    }

    const localId = this._nextPendingId++;
    this.memoryStore.pending_reports.push({ id: localId, ...entry });
    return { success: true, queued: true, localId };
  }

  async getPendingReports() {
    await this.init();
    if (this.isNative && this.db) {
      try {
        if (typeof this.db.getAllAsync === 'function') {
          return await this.db.getAllAsync(`SELECT id, region_id, hazard_type, description, latitude, longitude, media_path, created_at, sync_status, retry_count FROM pending_reports ORDER BY id ASC`);
        } else if (typeof this.db.getAllSync === 'function') {
          return this.db.getAllSync(`SELECT id, region_id, hazard_type, description, latitude, longitude, media_path, created_at, sync_status, retry_count FROM pending_reports ORDER BY id ASC`);
        }
      } catch (err) {
        console.warn('Failed to get pending reports from SQLite:', err);
      }
    }

    return [...this.memoryStore.pending_reports];
  }

  async removePendingReport(id) {
    await this.init();
    if (this.isNative && this.db) {
      try {
        if (typeof this.db.runAsync === 'function') {
          await this.db.runAsync(`DELETE FROM pending_reports WHERE id = ?`, [id]);
        } else if (typeof this.db.runSync === 'function') {
          this.db.runSync(`DELETE FROM pending_reports WHERE id = ?`, [id]);
        }
        return true;
      } catch (err) {
        console.warn('Failed to remove pending report from SQLite:', err);
      }
    }

    this.memoryStore.pending_reports = this.memoryStore.pending_reports.filter(r => r.id !== id);
    return true;
  }

  async updatePendingReportStatus(id, sync_status, retry_count) {
    await this.init();
    if (this.isNative && this.db) {
      try {
        if (typeof this.db.runAsync === 'function') {
          await this.db.runAsync(
            `UPDATE pending_reports SET sync_status = ?, retry_count = ? WHERE id = ?`,
            [sync_status, retry_count, id]
          );
        } else if (typeof this.db.runSync === 'function') {
          this.db.runSync(
            `UPDATE pending_reports SET sync_status = ?, retry_count = ? WHERE id = ?`,
            [sync_status, retry_count, id]
          );
        }
        return;
      } catch (err) {
        console.warn('Failed to update pending report status in SQLite:', err);
      }
    }

    const item = this.memoryStore.pending_reports.find(r => r.id === id);
    if (item) {
      item.sync_status = sync_status;
      if (retry_count !== undefined) item.retry_count = retry_count;
    }
  }

  async getPendingCount() {
    await this.init();
    if (this.isNative && this.db) {
      try {
        let row = null;
        if (typeof this.db.getFirstAsync === 'function') {
          row = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM pending_reports`);
        } else if (typeof this.db.getFirstSync === 'function') {
          row = this.db.getFirstSync(`SELECT COUNT(*) as count FROM pending_reports`);
        }
        if (row && row.count !== undefined) return row.count;
      } catch (err) {
        console.warn('Failed to get pending count from SQLite:', err);
      }
    }

    return this.memoryStore.pending_reports.length;
  }

  async clearAll() {
    await this.init();
    if (this.isNative && this.db) {
      try {
        const queries = `
          DELETE FROM regions;
          DELETE FROM risk_statuses;
          DELETE FROM alerts;
          DELETE FROM citizen_reports;
          DELETE FROM pending_reports;
        `;
        if (typeof this.db.execAsync === 'function') {
          await this.db.execAsync(queries);
        } else if (typeof this.db.execSync === 'function') {
          this.db.execSync(queries);
        }
      } catch (err) {
        console.warn('Failed to clear SQLite tables:', err);
      }
    }

    this.memoryStore.regions.clear();
    this.memoryStore.risk_statuses.clear();
    this.memoryStore.alerts.clear();
    this.memoryStore.citizen_reports.clear();
    this.memoryStore.pending_reports = [];
  }
}

export const dbService = new MobileDatabase();

