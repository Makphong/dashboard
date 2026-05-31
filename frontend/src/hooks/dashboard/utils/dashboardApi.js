import { requestJson } from '../../../lib/api.js';

export async function fetchDashboardPayload(includeDebug = false) {
  const [sourcesRes, performanceRes, healthRes, debugRes, connectionsRes] = await Promise.all([
    requestJson('/api/sources'),
    requestJson('/api/user-performance'),
    requestJson('/api/health').catch((error) => ({ __error: error.message })),
    includeDebug ? requestJson('/api/debug').catch((error) => ({ __error: error.message })) : Promise.resolve(null),
    requestJson('/api/gsheet/connections').catch(() => ({ connections: [] })),
  ]);

  return {
    sources: sourcesRes.sources || [],
    performance: performanceRes || null,
    connections: connectionsRes.connections || [],
    healthInfo: healthRes?.__error ? null : healthRes,
    healthError: healthRes?.__error || '',
    debugInfo: debugRes?.__error ? null : debugRes,
  };
}

export async function triggerGSheetSync() {
  return requestJson('/api/gsheet/sync', { method: 'POST' });
}
