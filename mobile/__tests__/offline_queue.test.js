const { queuePendingReport, getPendingReports, syncPendingReports } = require('../src/services/offlineQueue');

describe('offline queue sync', () => {
  beforeEach(() => {
    const storage = {
      store: {},
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
      },
      setItem(key, value) {
        this.store[key] = String(value);
      },
      removeItem(key) {
        delete this.store[key];
      },
    };

    global.localStorage = storage;
  });

  test('queues a report locally when offline and preserves the pending status', async () => {
    const report = {
      region_id: 7,
      hazard_type: 'Rockfall',
      description: 'Large boulder near the road',
      latitude: 11.1,
      longitude: 76.2,
    };

    const result = await queuePendingReport(report);

    expect(result.success).toBe(true);
    expect(result.report.status).toBe('pending');
    expect(getPendingReports().length).toBe(1);
  });

  test('syncs queued reports once and clears them after a successful upload', async () => {
    const report1 = {
      region_id: 7,
      hazard_type: 'Mudslide',
      description: 'Mud on the hillside',
      latitude: 11.2,
      longitude: 76.3,
    };
    const report2 = {
      region_id: 8,
      hazard_type: 'Soil Cracks',
      description: 'Ground cracking near school',
      latitude: 11.3,
      longitude: 76.4,
    };

    await queuePendingReport(report1);
    await queuePendingReport(report2);

    const calls = [];
    const syncResult = await syncPendingReports(async (payload) => {
      calls.push(payload);
      return { ok: true, data: { ...payload, status: 'submitted', id: payload.region_id } };
    });

    expect(syncResult.synced).toBe(2);
    expect(syncResult.failed).toBe(0);
    expect(getPendingReports().length).toBe(0);
    expect(calls).toHaveLength(2);
  });
});
