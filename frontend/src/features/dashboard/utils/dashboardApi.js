import { requestJson } from '../../../lib/api.js';

export async function fetchDashboardPayload(includeDebug = false) {
  const query = includeDebug ? '?includeDebug=1' : '';
  const payload = await requestJson(`/api/dashboard${query}`);

  return {
    sources: payload.sources || [],
    performance: payload.performance || null,
    connections: payload.connections || [],
    healthInfo: payload.healthInfo || null,
    healthError: '',
    debugInfo: includeDebug ? (payload.debugInfo || null) : null,
  };
}

export async function triggerGSheetSync() {
  return requestJson('/api/gsheet/sync', { method: 'POST' });
}
