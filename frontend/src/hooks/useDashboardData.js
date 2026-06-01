import { useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { fetchDashboardPayload, triggerGSheetSync } from '../features/dashboard/utils/dashboardApi.js';
import { useDashboardDerivedData } from '../features/dashboard/hooks/useDashboardDerivedData.js';
import { useDashboardFilters } from '../features/dashboard/hooks/useDashboardFilters.js';
import { useDashboardMetrics } from '../features/dashboard/hooks/useDashboardMetrics.js';

export function useDashboardData() {
  const [sources, setSources] = useState([]);
  const [gsheetConnections, setGsheetConnections] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [firestoreError, setFirestoreError] = useState('');
  const [backendWarning, setBackendWarning] = useState('');
  const [debugFetchError, setDebugFetchError] = useState('');
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const [datePreset, setDatePreset] = usePersistentState('filter_datePreset', 'all');
  const [dateStart, setDateStart] = usePersistentState('filter_dateStart', '');
  const [dateEnd, setDateEnd] = usePersistentState('filter_dateEnd', '');
  const [selectedFiles, setSelectedFiles] = usePersistentState('filter_selectedFiles', []);
  const [selectedSheets, setSelectedSheets] = usePersistentState('filter_selectedSheets', []);
  const [selectedUsers, setSelectedUsers] = usePersistentState('filter_selectedUsers', []);
  const [selectedSegmentTypes, setSelectedSegmentTypes] = usePersistentState('filter_selectedSegmentTypes', []);
  const [showIdle, setShowIdle] = usePersistentState('filter_showIdle', false);
  const [showWorkloadIdle, setShowWorkloadIdle] = usePersistentState('filter_showWorkloadIdle', false);
  const [showWorkloadSystem, setShowWorkloadSystem] = usePersistentState('filter_showWorkloadSystem', false);
  const [pinnedFiles, setPinnedFiles] = usePersistentState('filter_pinnedFiles', []);
  const [pinnedSheets, setPinnedSheets] = usePersistentState('filter_pinnedSheets', []);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '');

  const {
    invalidSheetCounts,
    parsedSegments,
    documentTree,
    userOptions,
    dateRangeBounds,
    segmentTypeOptions,
    normalizedSelectedSegmentTypes,
  } = useDashboardDerivedData({
    sources,
    performance,
    datePreset,
    dateStart,
    dateEnd,
    selectedFiles,
    selectedSheets,
    selectedSegmentTypes,
  });

  const { filteredBaseSegments, ganttVisibleSegments } = useDashboardFilters(parsedSegments, {
    selectedFiles,
    selectedSheets,
    selectedUsers,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
    showIdle,
    dateRangeBounds,
  });

  const {
    kpiData,
    flowRows,
    contributionRows,
    workloadContributors,
  } = useDashboardMetrics({
    ganttVisibleSegments,
    filteredBaseSegments,
    showWorkloadIdle,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
  });

  const buildFirestoreErrorMessage = (healthInfo) => {
    const firestore = healthInfo?.firestore;
    if (!firestore) return '';

    const reason = String(firestore.error || firestore.reason || '').trim();
    const syncError = String(firestore.lastSyncError || '').trim();
    if (firestore.enabled && firestore.clientReady && firestore.lastSyncOk === false) {
      return `Firestore sync failed${syncError ? `: ${syncError}` : ''}. Current data may disappear after server restart because only SQLite was updated.`;
    }
    if (firestore.enabled && !firestore.clientReady) {
      return `Firestore connection failed${reason ? `: ${reason}` : ''}. System is using SQLite fallback.`;
    }
    if (firestore.configured && !firestore.enabled) {
      return `Firestore configuration is invalid${reason ? `: ${reason}` : ''}. System is using SQLite fallback.`;
    }
    return '';
  };

  const loadDashboardPayload = async (options = {}) => {
    const payload = await fetchDashboardPayload(Boolean(options.includeDebug));

    setSources(payload.sources);
    setPerformance(payload.performance);
    setGsheetConnections(payload.connections);
    setHealthInfo(payload.healthInfo);
    setFirestoreError(buildFirestoreErrorMessage(payload.healthInfo));

    if (payload.healthError) {
      setBackendWarning(`Health error: ${payload.healthError}`);
    }

    if (options.includeDebug) {
      setDebugInfo(payload.debugInfo);
    }
  };

  const syncGSheet = async () => {
    setSyncing(true);
    try {
      await triggerGSheetSync();
    } finally {
      setSyncing(false);
    }
  };

  const refreshAll = async (options = {}) => {
    setLoading(true);
    try {
      if (options.syncFirst !== false) await syncGSheet();
      await loadDashboardPayload(options);

      if (options.backgroundSync) {
        syncGSheet()
          .then(() => loadDashboardPayload(options))
          .catch((error) => setBackendWarning(`Background sync error: ${error.message || 'Sync failed'}`));
      }
    } catch (error) {
      setErrorMessage(error.message || 'Refresh failed');
    } finally {
      setLoading(false);
      if (!options.backgroundSync) setSyncing(false);
      setIsInitialLoadDone(true);
    }
  };

  useEffect(() => {
    refreshAll({ syncFirst: false, backgroundSync: true });
  }, []);

  return {
    sources,
    gsheetConnections,
    performance,
    healthInfo,
    debugInfo,
    loading,
    syncing,
    errorMessage,
    firestoreError,
    backendWarning,
    debugFetchError,
    isInitialLoadDone,
    datePreset,
    setDatePreset,
    dateStart,
    setDateStart,
    dateEnd,
    setDateEnd,
    selectedFiles,
    setSelectedFiles,
    selectedSheets,
    setSelectedSheets,
    selectedUsers,
    setSelectedUsers,
    selectedSegmentTypes: normalizedSelectedSegmentTypes,
    setSelectedSegmentTypes,
    showIdle,
    setShowIdle,
    showWorkloadIdle,
    setShowWorkloadIdle,
    showWorkloadSystem,
    setShowWorkloadSystem,
    pinnedFiles,
    setPinnedFiles,
    pinnedSheets,
    setPinnedSheets,
    activeDocumentFile,
    setActiveDocumentFile,
    documentTree,
    userOptions,
    segmentTypeOptions,
    invalidSheetCounts,
    ganttVisibleSegments,
    kpiData,
    filteredBaseSegments,
    flowRows,
    contributionRows,
    workloadContributors,
    refreshAll,
    setErrorMessage,
  };
}
