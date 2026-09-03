const QUEUE_KEY = 'citizen_offline_queue_v1';

const safeJsonParse = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
};

const getStorage = () => {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
  return {
    getItem: () => null,
    setItem: () => undefined,
  };
};

export const getPendingReports = () => {
  const storage = getStorage();
  return safeJsonParse(storage.getItem(QUEUE_KEY), []);
};

const persistQueue = (queue) => {
  const storage = getStorage();
  storage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const queuePendingReport = async (reportData) => {
  const queue = getPendingReports();
  const item = {
    id: `offline_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    ...reportData,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    retry_count: 0,
  };

  queue.push(item);
  persistQueue(queue);

  return {
    success: true,
    queued: true,
    report: item,
  };
};

export const syncPendingReports = async (submitFn) => {
  const queue = getPendingReports();

  if (!queue.length) {
    return { synced: 0, failed: 0, queued: 0 };
  }

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      await submitFn({
        region_id: item.region_id,
        hazard_type: item.hazard_type,
        description: item.description,
        latitude: item.latitude,
        longitude: item.longitude,
      });
      synced += 1;
    } catch (error) {
      failed += 1;
      remaining.push({
        ...item,
        status: 'pending',
        retry_count: (item.retry_count || 0) + 1,
        updated_at: new Date().toISOString(),
      });
    }
  }

  persistQueue(remaining);
  return { synced, failed, queued: remaining.length };
};
