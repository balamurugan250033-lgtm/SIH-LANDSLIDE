import { dbService } from './database';
import api from './api';

export const syncService = {
  /**
   * Queues a citizen hazard report into the SQLite pending_reports table.
   */
  queueReport: async (reportData) => {
    try {
      const result = await dbService.queuePendingReport(reportData);
      return result;
    } catch (e) {
      console.error('Failed to queue report in SQLite', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Returns the count of pending reports waiting to be synced.
   */
  getPendingCount: async () => {
    try {
      return await dbService.getPendingCount();
    } catch (e) {
      console.error('Failed to get pending count', e);
      return 0;
    }
  },

  /**
   * Pushes all pending reports from SQLite pending_reports table to backend.
   * On success, deletes from pending_reports and writes into cached citizen_reports table.
   */
  syncQueuedReports: async () => {
    try {
      const pending = await dbService.getPendingReports();
      if (!pending || pending.length === 0) return { synced: 0, failed: 0 };

      let syncedCount = 0;
      let failedCount = 0;

      for (const report of pending) {
        try {
          const payload = {
            region_id: report.region_id,
            hazard_type: report.hazard_type,
            description: report.description,
            latitude: report.latitude,
            longitude: report.longitude,
          };
          const response = await api.post('/citizen/reports', payload);
          
          // Save to local cached reports
          if (response.data) {
            await dbService.saveCitizenReports([response.data]);
          }
          
          // Remove from pending_reports queue in SQLite
          await dbService.removePendingReport(report.id);
          syncedCount++;
        } catch (e) {
          console.warn(`Failed to sync pending report #${report.id}, incrementing retry`, e);
          const nextRetry = (report.retry_count || 0) + 1;
          await dbService.updatePendingReportStatus(report.id, 'failed', nextRetry);
          failedCount++;
        }
      }

      return { synced: syncedCount, failed: failedCount };
    } catch (e) {
      console.error('Error during syncQueuedReports', e);
      return { synced: 0, failed: 0, error: e.message };
    }
  },

  /**
   * Pulls latest server state (regions, risk statuses, alerts) into local SQLite cache.
   */
  syncServerState: async () => {
    try {
      // 1. Fetch Regions
      const regionsRes = await api.get('/regions');
      const fetchedRegions = regionsRes.data || [];
      await dbService.saveRegions(fetchedRegions);

      // 2. Fetch Risk Statuses for each region
      const fetchedRiskMap = {};
      for (const reg of fetchedRegions) {
        try {
          const riskRes = await api.get(`/citizen/risk?region_id=${reg.id}`);
          fetchedRiskMap[reg.id] = riskRes.data;
        } catch {
          fetchedRiskMap[reg.id] = {
            current_alert: null,
            latest_observation: null,
            data_status: 'UNAVAILABLE'
          };
        }
      }
      await dbService.saveRiskStatuses(fetchedRiskMap);

      // 3. Fetch Alerts
      const alertsRes = await api.get('/citizen/alerts');
      const fetchedAlerts = alertsRes.data || [];
      await dbService.saveAlerts(fetchedAlerts);

      return {
        success: true,
        regions: fetchedRegions,
        riskStatuses: fetchedRiskMap,
        alerts: fetchedAlerts
      };
    } catch (e) {
      console.warn('syncServerState network error, using local SQLite cache:', e);
      return {
        success: false,
        error: e.message
      };
    }
  },

  /**
   * Loads all cached entities directly from SQLite storage.
   */
  loadLocalCache: async () => {
    try {
      const [regions, riskStatuses, alerts, reports] = await Promise.all([
        dbService.getRegions(),
        dbService.getRiskStatuses(),
        dbService.getAlerts(),
        dbService.getCitizenReports(),
      ]);

      return {
        regions: regions || [],
        riskStatuses: riskStatuses || {},
        alerts: alerts || [],
        reports: reports || [],
      };
    } catch (e) {
      console.error('Failed to load local SQLite cache', e);
      return {
        regions: [],
        riskStatuses: {},
        alerts: [],
        reports: [],
      };
    }
  },

  /**
   * Full background sync routine:
   * 1. Pushes pending local writes (offline reports)
   * 2. Pulls latest server state into local cache
   */
  performFullSync: async () => {
    const queueResult = await syncService.syncQueuedReports();
    const serverResult = await syncService.syncServerState();
    return {
      queueResult,
      serverResult
    };
  }
};
