import { dbService } from '../src/services/database';
import { syncService } from '../src/services/sync';
import api from '../src/services/api';

// Mock api client
jest.mock('../src/services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

describe('Offline Synchronization Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbService.clearAll();
  });

  test('queueReport should push reports to local SQLite pending_reports storage', async () => {
    const report = { region_id: 1, hazard_type: 'Rockfall', description: 'Boulders on road' };
    const res = await syncService.queueReport(report);
    
    expect(res.success).toBe(true);
    expect(res.queued).toBe(true);
    
    const pending = await dbService.getPendingReports();
    expect(pending.length).toBe(1);
    expect(pending[0].hazard_type).toBe('Rockfall');
    expect(pending[0].region_id).toBe(1);
  });

  test('syncQueuedReports should upload reports and retain only failed ones', async () => {
    // Queue two reports
    const report1 = { region_id: 1, hazard_type: 'Mudslide', description: 'Debris flow' };
    const report2 = { region_id: 2, hazard_type: 'Landslide', description: 'Slope sliding' };
    
    await syncService.queueReport(report1);
    await syncService.queueReport(report2);
    
    // Mock API behaviour: region 1 succeeds, region 2 fails (e.g. network issue)
    api.post.mockImplementation((url, data) => {
      if (data.region_id === 1) {
        return Promise.resolve({ data: { id: 10, ...data, status: 'Submitted' }, status: 200 });
      }
      return Promise.reject(new Error('Network error'));
    });
    
    await syncService.syncQueuedReports();
    
    // Check that api.post was called for both queued items
    expect(api.post).toHaveBeenCalledTimes(2);
    
    // Retrieve queue from SQLite pending_reports and check that only region 2 report remains
    const pending = await dbService.getPendingReports();
    expect(pending.length).toBe(1);
    expect(pending[0].region_id).toBe(2);
  });
});
