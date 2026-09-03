import { dbService } from '../src/services/database';
import { syncService } from '../src/services/sync';
import api from '../src/services/api';

// Mock API client
jest.mock('../src/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

describe('Mobile SQLite Database & Offline Cache Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbService.clearAll();
  });

  test('dbService initializes cleanly and starts with empty tables', async () => {
    await dbService.init();
    const regions = await dbService.getRegions();
    const alerts = await dbService.getAlerts();
    const riskStatuses = await dbService.getRiskStatuses();
    const pending = await dbService.getPendingReports();

    expect(regions).toEqual([]);
    expect(alerts).toEqual([]);
    expect(riskStatuses).toEqual({});
    expect(pending).toEqual([]);
  });

  test('caches regions in local SQLite database and retrieves them', async () => {
    const mockRegions = [
      { id: 1, name: 'Munnar, Kerala', latitude: 10.0889, longitude: 77.0595 },
      { id: 2, name: 'Guwahati, Assam', latitude: 26.1445, longitude: 91.7362 },
    ];

    await dbService.saveRegions(mockRegions);
    const cached = await dbService.getRegions();

    expect(cached.length).toBe(2);
    expect(cached[0].name).toBe('Munnar, Kerala');
    expect(cached[1].id).toBe(2);
  });

  test('caches risk statuses per region in SQLite and retrieves them', async () => {
    const mockRiskMap = {
      1: {
        current_alert: { risk_level: 'HIGH', reason: 'High rainfall' },
        latest_observation: { rainfall_mm: 150.0 },
        data_status: 'LIVE',
      },
      2: {
        current_alert: null,
        latest_observation: { rainfall_mm: 20.0 },
        data_status: 'LIVE',
      },
    };

    await dbService.saveRiskStatuses(mockRiskMap);
    const retrieved = await dbService.getRiskStatuses();

    expect(retrieved['1']).toBeDefined();
    expect(retrieved['1'].current_alert.risk_level).toBe('HIGH');
    expect(retrieved['2'].current_alert).toBeNull();
  });

  test('caches active alerts in SQLite and sorts by timestamp descending', async () => {
    const mockAlerts = [
      { id: 101, region_id: 1, risk_level: 'MODERATE', reason: 'Rising soil moisture', timestamp: '2026-09-01T10:00:00Z' },
      { id: 102, region_id: 2, risk_level: 'CRITICAL', reason: 'Severe slope failure risk', timestamp: '2026-09-01T12:00:00Z' },
    ];

    await dbService.saveAlerts(mockAlerts);
    const retrieved = await dbService.getAlerts();

    expect(retrieved.length).toBe(2);
    // Highest timestamp should be first
    expect(retrieved[0].id).toBe(102);
    expect(retrieved[0].risk_level).toBe('CRITICAL');
  });

  test('queues citizen hazard report into pending_reports table when offline', async () => {
    const reportData = {
      region_id: 1,
      hazard_type: 'Rockfall',
      description: 'Massive boulders blocking NH-85',
      latitude: 10.089,
      longitude: 77.060,
    };

    const res = await syncService.queueReport(reportData);
    expect(res.success).toBe(true);
    expect(res.queued).toBe(true);

    const pendingCount = await syncService.getPendingCount();
    expect(pendingCount).toBe(1);

    const pendingList = await dbService.getPendingReports();
    expect(pendingList.length).toBe(1);
    expect(pendingList[0].hazard_type).toBe('Rockfall');
    expect(pendingList[0].sync_status).toBe('pending');
  });

  test('syncQueuedReports flushes pending reports to backend and stores confirmed report', async () => {
    // Queue 2 reports offline
    await syncService.queueReport({ region_id: 1, hazard_type: 'Mudslide', description: 'Debris on road' });
    await syncService.queueReport({ region_id: 2, hazard_type: 'Soil Cracks', description: 'Cracks on hillside' });

    expect(await syncService.getPendingCount()).toBe(2);

    // Mock API post response
    api.post.mockImplementation((url, payload) => {
      return Promise.resolve({
        data: {
          id: Math.floor(Math.random() * 1000) + 1,
          region_id: payload.region_id,
          hazard_type: payload.hazard_type,
          description: payload.description,
          status: 'Submitted',
          timestamp: new Date().toISOString(),
        },
      });
    });

    const syncResult = await syncService.syncQueuedReports();

    expect(syncResult.synced).toBe(2);
    expect(syncResult.failed).toBe(0);
    expect(api.post).toHaveBeenCalledTimes(2);

    // Queue should be empty now
    expect(await syncService.getPendingCount()).toBe(0);

    // Cached citizen reports should have the synced reports
    const cachedReports = await dbService.getCitizenReports();
    expect(cachedReports.length).toBe(2);
  });

  test('syncQueuedReports retains failed items and increments retry count', async () => {
    await syncService.queueReport({ region_id: 1, hazard_type: 'Rockfall', description: 'Road block' });

    // Mock network failure
    api.post.mockRejectedValue(new Error('Network connection timeout'));

    const syncResult = await syncService.syncQueuedReports();

    expect(syncResult.synced).toBe(0);
    expect(syncResult.failed).toBe(1);

    // Pending item is retained in SQLite
    const pending = await dbService.getPendingReports();
    expect(pending.length).toBe(1);
    expect(pending[0].sync_status).toBe('failed');
    expect(pending[0].retry_count).toBe(1);
  });

  test('syncServerState pulls regions, risk, alerts and writes into SQLite cache', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/regions') {
        return Promise.resolve({
          data: [{ id: 1, name: 'Shillong, Meghalaya', latitude: 25.5788, longitude: 91.8933 }],
        });
      }
      if (url.includes('/citizen/risk')) {
        return Promise.resolve({
          data: {
            current_alert: { risk_level: 'SEVERE', reason: 'High precipitation' },
            latest_observation: { rainfall_mm: 180.0 },
            data_status: 'LIVE',
          },
        });
      }
      if (url.includes('/citizen/alerts')) {
        return Promise.resolve({
          data: [{ id: 201, region_id: 1, risk_level: 'SEVERE', reason: 'Evacuation required', timestamp: '2026-09-01T11:00:00Z' }],
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await syncService.syncServerState();
    expect(result.success).toBe(true);

    // Check that SQLite was populated
    const cachedRegions = await dbService.getRegions();
    expect(cachedRegions.length).toBe(1);
    expect(cachedRegions[0].name).toBe('Shillong, Meghalaya');

    const cachedRisk = await dbService.getRiskStatuses();
    expect(cachedRisk['1'].current_alert.risk_level).toBe('SEVERE');

    const cachedAlerts = await dbService.getAlerts();
    expect(cachedAlerts.length).toBe(1);
    expect(cachedAlerts[0].id).toBe(201);
  });
});

