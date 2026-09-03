const QUEUE_KEY = 'citizen_pending_reports_v1';

const readQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
};

const writeQueue = (queue) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getPendingReports = () => readQueue();

export const queuePendingReport = (reportData) => {
  const queue = readQueue();
  const item = {
    id: `offline_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    ...reportData,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    retry_count: 0,
  };

  queue.push(item);
  writeQueue(queue);

  return {
    success: true,
    queued: true,
    report: item,
  };
};

export const syncPendingReports = async (submitFn) => {
  const pending = readQueue();
  if (!pending.length) {
    return { synced: 0, failed: 0, queued: 0 };
  }

  const remaining = [];
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
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

  writeQueue(remaining);
  return { synced, failed, queued: remaining.length };
};

export const clearPendingReports = () => {
  writeQueue([]);
};
