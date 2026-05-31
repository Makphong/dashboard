import { useState, useEffect, useMemo, useRef } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { requestJson } from '../lib/api.js';
import {
  toTimelineLane,
  safeNumber,
  isUserContextSegment,
  isIdleContextSegment,
  toDrillGroup,
  buildSheetKey,
  extractFileNameFromSheetKey,
  buildKpisFromSegments,
  buildKpiData
} from '../lib/utils.js';
import {
  initialKpiData,
  FLOW_INSIGHT_GROUPS,
  WORKFLOW_FLOW_SEGMENT_TYPES
} from '../lib/constants.js';

export function useDashboardData() {
  const [sources, setSources] = useState([]);
  const [gsheetConnections, setGsheetConnections] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [backendWarning, setBackendWarning] = useState('');
  const [debugFetchError, setDebugFetchError] = useState('');

  // Filters State
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

  const segmentGroupOptions = useMemo(() => ['Uploading', 'Processing', 'Reprocess', 'Review', 'Edit', 'Idle'], []);
  const normalizedSelectedSegmentTypes = useMemo(() => {
    const allowedGroups = new Set(segmentGroupOptions);
    return selectedSegmentTypes.filter((value) => allowedGroups.has(value));
  }, [selectedSegmentTypes, segmentGroupOptions]);

  const segments = performance?.segments || [];
  const invalidSheetCounts = performance?.invalidSheetCounts || {};

  const { parsedSegments } = useMemo(() => {
    const valid = [];

    segments.forEach((segment, idx) => {
      const [docFileFromId = '', docPageFromId = ''] = String(segment.documentId || '').split('::');
      const fileName = String(segment.fileName || docFileFromId || 'Unknown File');
      const pageName = String(segment.pageName || docPageFromId || '');
      const sheetKey = buildSheetKey(fileName, pageName);

      const startTs = Date.parse(segment.start || '');
      const endTsRaw = Date.parse(segment.end || '');
      if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) {
        return;
      }

      const documentLabel = pageName ? `${fileName} / ${pageName}` : fileName;
      valid.push({
        ...segment,
        id: segment.id || `${segment.segmentType || 'UNKNOWN'}-${idx}`,
        segmentType: String(segment.segmentType || 'UNKNOWN'),
        userName: String(segment.userName || 'Unknown User'),
        fileName,
        pageName,
        sheetKey,
        startTs,
        endTs: Math.max(endTsRaw, startTs + 1000),
        documentLabel,
      });
    });

    return { parsedSegments: valid };
  }, [segments]);

  const documentTree = useMemo(() => {
    const fileMap = new Map();
    (sources || []).forEach((source) => {
      const fileName = String(source.fileName || source.name || 'Unknown File');
      if (!fileMap.has(fileName)) fileMap.set(fileName, new Set());
      (source.pages || []).forEach((page) => {
        if (page) fileMap.get(fileName).add(String(page));
      });
    });
    parsedSegments.forEach((segment) => {
      if (!fileMap.has(segment.fileName)) fileMap.set(segment.fileName, new Set());
      if (segment.pageName) fileMap.get(segment.fileName).add(segment.pageName);
    });
    return Array.from(fileMap.entries())
      .map(([fileName, sheetSet]) => ({
        fileName,
        sheets: Array.from(sheetSet).sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  }, [sources, parsedSegments]);

  const latestSourceFileName = useMemo(() => {
    if (!sources || sources.length === 0) return '';
    return String(sources[0].fileName || sources[0].name || '');
  }, [sources]);

  const userOptions = useMemo(
    () => {
      let minTs = Number.NEGATIVE_INFINITY;
      let maxTs = Number.POSITIVE_INFINITY;
      if (parsedSegments.length > 0) {
        if (datePreset === 'custom') {
          const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
          const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
          minTs = Math.min(startTs, endTs);
          maxTs = Math.max(startTs, endTs);
        } else if (datePreset !== 'all') {
          const latestEndTs = parsedSegments.reduce((maxValue, segment) => Math.max(maxValue, segment.endTs), parsedSegments[0].endTs);
          const dayWindowMap = { '7d': 7, '30d': 30, '90d': 90 };
          const windowDays = dayWindowMap[datePreset] || 30;
          minTs = latestEndTs - (windowDays * 24 * 60 * 60 * 1000);
          maxTs = latestEndTs;
        }
      }

      const selectedSheetKeys = new Set(selectedSheets);
      const selectedFileNames = new Set(selectedFiles);
      const useSheetFilter = selectedSheetKeys.size > 0;
      const names = new Set();

      for (const seg of parsedSegments) {
        if (seg.endTs < minTs || seg.startTs > maxTs) continue;
        if (useSheetFilter) {
          if (!selectedSheetKeys.has(seg.sheetKey)) continue;
        } else if (selectedFileNames.size > 0 && !selectedFileNames.has(seg.fileName)) {
          continue;
        }

        const lane = toTimelineLane(seg.segmentType, seg.userName);
        if (lane !== 'Idle' && lane !== 'Unknown User') {
          names.add(lane);
        }
      }
      return Array.from(names).sort((a, b) => a.localeCompare(b));
    },
    [parsedSegments, selectedSheets, selectedFiles, datePreset, dateStart, dateEnd]
  );

  const segmentTypeOptions = useMemo(
    () => segmentGroupOptions,
    [segmentGroupOptions]
  );

  const dateRangeBounds = useMemo(() => {
    if (parsedSegments.length === 0) return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
    if (datePreset === 'custom') {
      const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
      const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
      return { minTs: Math.min(startTs, endTs), maxTs: Math.max(startTs, endTs) };
    }
    if (datePreset === 'all') return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
    const latestEndTs = parsedSegments.reduce((maxTs, segment) => Math.max(maxTs, segment.endTs), parsedSegments[0].endTs);
    const windowDays = { '7d': 7, '30d': 30, '90d': 90 }[datePreset] || 30;
    return { minTs: latestEndTs - (windowDays * 24 * 60 * 60 * 1000), maxTs: latestEndTs };
  }, [parsedSegments, datePreset, dateStart, dateEnd]);

  const filteredBaseSegments = useMemo(() => {
    if (parsedSegments.length === 0) return [];
    const fileSet = new Set(selectedFiles);
    const sheetSet = new Set(selectedSheets);
    const userSet = new Set(selectedUsers);
    
    // If no files or sheets are selected, return empty by default
    // This addresses the user's concern about why data shows up without selecting a sheet.
    if (fileSet.size === 0 && sheetSet.size === 0) {
      return [];
    }

    const filesWithSpecificSheets = new Set();
    for (const sheetKey of selectedSheets) {
      filesWithSpecificSheets.add(extractFileNameFromSheetKey(sheetKey));
    }
    
    return parsedSegments.filter((segment) => {
      if (segment.endTs < dateRangeBounds.minTs || segment.startTs > dateRangeBounds.maxTs) return false;

      const fileSelected = fileSet.has(segment.fileName);
      const sheetSelected = sheetSet.has(segment.sheetKey);
      const hasSpecificSheets = filesWithSpecificSheets.has(segment.fileName);

      if (hasSpecificSheets) {
        if (!sheetSelected) return false;
      } else {
        if (!fileSelected) return false;
      }

      if (userSet.size > 0) {
        const lane = toTimelineLane(segment.segmentType, segment.userName);
        if (!userSet.has(lane)) return false;
      }
      return true;
    });
  }, [parsedSegments, dateRangeBounds, selectedFiles, selectedSheets, selectedUsers]);

  const ganttVisibleSegments = useMemo(() => {
    let filtered = filteredBaseSegments.filter((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!showIdle && isIdleContextSegment(segmentType)) return false;
      const drillGroup = toDrillGroup(segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if (normalizedSelectedSegmentTypes.length > 0 && !normalizedSelectedSegmentTypes.includes(segmentGroup)) return false;
      return true;
    });

    return filtered;
  }, [filteredBaseSegments, showIdle, normalizedSelectedSegmentTypes]);

  const kpiData = useMemo(() => {
    const kpis = ganttVisibleSegments.length > 0 ? buildKpisFromSegments(ganttVisibleSegments) : null;
    return kpis ? buildKpiData(kpis) : initialKpiData;
  }, [ganttVisibleSegments]);

  const flowRows = useMemo(() => {
    const groupedByDocument = new Map();
    ganttVisibleSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!WORKFLOW_FLOW_SEGMENT_TYPES.has(segmentType)) return;
      const documentKey = String(segment.documentId || segment.sheetKey || `${segment.fileName || ''}::${segment.pageName || ''}`);
      if (!groupedByDocument.has(documentKey)) groupedByDocument.set(documentKey, []);
      groupedByDocument.get(documentKey).push(segment);
    });

    const USER_ACTION_TYPES = new Set([
      'USER_REVIEW_COMMENT_CHECK',
      'USER_REVIEW_AUTO_TIMEOUT',
      'USER_EDITING_CORRECTION',
      'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
      'USER_COMPLETION_APPROVAL',
    ]);
    const COMPLETE_TYPES = new Set([
      'USER_COMPLETION_APPROVAL',
      'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
    ]);

    const statsById = Object.fromEntries(
      FLOW_INSIGHT_GROUPS.map((group) => [group.id, { totalSeconds: 0, count: 0, minSeconds: null, maxSeconds: null }])
    );

    const addMetric = (metricId, seconds, { capSeconds = 0 } = {}) => {
      const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
      if (!Number.isFinite(safeSeconds)) return;
      if (capSeconds > 0 && safeSeconds > capSeconds) return;
      statsById[metricId].totalSeconds += safeSeconds;
      statsById[metricId].count += 1;
      statsById[metricId].minSeconds = statsById[metricId].minSeconds === null
        ? safeSeconds
        : Math.min(statsById[metricId].minSeconds, safeSeconds);
      statsById[metricId].maxSeconds = statsById[metricId].maxSeconds === null
        ? safeSeconds
        : Math.max(statsById[metricId].maxSeconds, safeSeconds);
    };

    groupedByDocument.forEach((segmentsByDoc) => {
      const sorted = [...segmentsByDoc].sort((a, b) => safeNumber(a.startTs) - safeNumber(b.startTs));
      if (sorted.length === 0) return;
      const reprocessIndices = [];
      for (let idx = 0; idx < sorted.length; idx += 1) {
        const current = sorted[idx];
        const currentType = String(current.segmentType || '');
        if (currentType === 'SYSTEM_SCHEDULED_REPROCESSING' || currentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2') {
          reprocessIndices.push(idx);
        }
        if (currentType === 'SYSTEM_INITIAL_PROCESSING') {
          const nextUserIdx = sorted.findIndex((candidate, candidateIdx) => (
            candidateIdx > idx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
          ));
          if (nextUserIdx > idx) {
            const next = sorted[nextUserIdx];
            addMetric('processing-round-1-to-user', (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000);
          }
        }
        if (USER_ACTION_TYPES.has(currentType)) {
          const nextUserStepIdx = sorted.findIndex((candidate, candidateIdx) => (
            candidateIdx > idx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
          ));
          if (nextUserStepIdx > idx) {
            const next = sorted[nextUserStepIdx];
            addMetric('user-review-edit-to-next-user-step', (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000);
          }
        }
      }
      let round2AnchorIdx = sorted.findIndex(s => String(s.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2');
      if (round2AnchorIdx < 0) round2AnchorIdx = reprocessIndices.length >= 1 ? reprocessIndices[0] : -1;
      if (round2AnchorIdx >= 0) {
        const nextUserIdx = sorted.findIndex((c, i) => i > round2AnchorIdx && USER_ACTION_TYPES.has(String(c.segmentType || '')));
        if (nextUserIdx > round2AnchorIdx) {
          addMetric('processing-round-2-to-user', (safeNumber(sorted[nextUserIdx].startTs) - safeNumber(sorted[round2AnchorIdx].endTs)) / 1000);
        }
      }
      const firstUpload = sorted.find(s => String(s.segmentType || '') === 'USER_UPLOADING');
      const latestComplete = [...sorted].reverse().find(s => COMPLETE_TYPES.has(String(s.segmentType || '')));
      if (firstUpload && latestComplete) {
        addMetric('upload-to-latest-complete', (safeNumber(latestComplete.endTs) - safeNumber(firstUpload.startTs)) / 1000);
      }
    });

    return FLOW_INSIGHT_GROUPS.map((group) => {
      const stats = statsById[group.id] || { totalSeconds: 0, count: 0, minSeconds: null, maxSeconds: null };
      return {
        transitionKey: group.id,
        transitionLabel: group.label,
        count: stats.count,
        avgSeconds: stats.count > 0 ? stats.totalSeconds / stats.count : 0,
        minSeconds: stats.count > 0 ? safeNumber(stats.minSeconds) : 0,
        maxSeconds: stats.count > 0 ? safeNumber(stats.maxSeconds) : 0,
      };
    });
  }, [ganttVisibleSegments]);

  const userStatsRows = useMemo(() => {
    const userStatsMap = new Map();
    ganttVisibleSegments.forEach((segment) => {
      const userName = String(segment.userName || '');
      if (!userName || userName.toLowerCase() === 'system') return;
      if (!String(segment.segmentType || '').startsWith('USER_')) return;
      const durationSeconds = safeNumber(segment.durationSeconds);
      if (!userStatsMap.has(userName)) {
        userStatsMap.set(userName, { user: userName, totalSeconds: 0, reviewSeconds: 0, editSeconds: 0, uploadSeconds: 0, sessionCount: 0, reworkCount: 0, autoClosedCount: 0, documents: new Set() });
      }
      const stats = userStatsMap.get(userName);
      stats.totalSeconds += durationSeconds;
      stats.documents.add(segment.sheetKey || segment.documentId);
      if (segment.segmentType === 'USER_UPLOADING') { stats.uploadSeconds += durationSeconds; return; }
      stats.sessionCount += 1;
      const st = String(segment.segmentType || '');
      if (st === 'USER_EDITING_CORRECTION' || st === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL') { 
        stats.editSeconds += durationSeconds; 
        stats.reworkCount += 1; 
      }
      else { stats.reviewSeconds += durationSeconds; }
      if (segment.autoTimeout || st === 'USER_REVIEW_AUTO_TIMEOUT') { stats.autoClosedCount += 1; }
    });
    return Array.from(userStatsMap.values()).map((stats) => ({
      user: stats.user, totalSeconds: stats.totalSeconds, reviewSeconds: stats.reviewSeconds, editSeconds: stats.editSeconds, uploadSeconds: stats.uploadSeconds,
      reworkRate: (stats.reviewSeconds + stats.editSeconds) > 0 ? stats.editSeconds / (stats.reviewSeconds + stats.editSeconds) : 0,
      autoClosedRate: stats.sessionCount > 0 ? stats.autoClosedCount / stats.sessionCount : 0,
      avgTimePerDocSeconds: stats.totalSeconds / Math.max(1, stats.documents.size),
      sessionCount: stats.sessionCount,
    })).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [ganttVisibleSegments]);

  const contributionRows = useMemo(() => userStatsRows.map(r => ({ ...r })), [userStatsRows]);
  const matrixRows = useMemo(() => userStatsRows.map(r => ({ ...r, totalActiveSeconds: r.totalSeconds })), [userStatsRows]);

  const workloadContributors = useMemo(() => {
    const laneDurationMap = new Map();
    filteredBaseSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      const durationSeconds = safeNumber(segment.durationSeconds);
      if (durationSeconds <= 0) return;

      const isIdle = isIdleContextSegment(segmentType);
      if (isIdle && !showWorkloadIdle) return;
      
      // Respect segment type selection
      const drillGroup = toDrillGroup(segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if (normalizedSelectedSegmentTypes.length > 0 && !normalizedSelectedSegmentTypes.includes(segmentGroup)) return;
      
      let lane = toTimelineLane(segmentType, segment.userName);
      if (segmentType.startsWith('SYSTEM_')) lane = 'System';
      if (isIdle) lane = 'Idle';
      laneDurationMap.set(lane, (laneDurationMap.get(lane) || 0) + durationSeconds);
    });
    return Array.from(laneDurationMap.entries()).map(([user, totalSeconds]) => ({ user, totalSeconds })).sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredBaseSegments, showWorkloadIdle, normalizedSelectedSegmentTypes]);

  const loadDashboardPayload = async (options = {}) => {
    const [sourcesRes, performanceRes, healthRes, debugRes, connectionsRes] = await Promise.all([
      requestJson('/api/sources'),
      requestJson('/api/user-performance'),
      requestJson('/api/health').catch(e => ({ __error: e.message })),
      options.includeDebug ? requestJson('/api/debug').catch(e => ({ __error: e.message })) : Promise.resolve(null),
      requestJson('/api/gsheet/connections').catch(() => ({ connections: [] })),
    ]);

    setSources(sourcesRes.sources || []);
    setPerformance(performanceRes || null);
    setGsheetConnections(connectionsRes.connections || []);
    setHealthInfo(healthRes?.__error ? null : healthRes);
    if (healthRes?.__error) setBackendWarning(`Health error: ${healthRes.__error}`);
    if (debugRes) setDebugInfo(debugRes.__error ? null : debugRes);
  };

  const syncGSheet = async () => {
    setSyncing(true);
    try {
      await requestJson('/api/gsheet/sync', { method: 'POST' });
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
    }
  };

  useEffect(() => { refreshAll({ syncFirst: false, backgroundSync: true }); }, []);

  return {
    sources, gsheetConnections, performance, healthInfo, debugInfo,
    loading, syncing, errorMessage, backendWarning, debugFetchError,
    datePreset, setDatePreset, dateStart, setDateStart, dateEnd, setDateEnd,
    selectedFiles, setSelectedFiles, selectedSheets, setSelectedSheets,
    selectedUsers, setSelectedUsers, selectedSegmentTypes: normalizedSelectedSegmentTypes, setSelectedSegmentTypes,
    showIdle, setShowIdle, showWorkloadIdle, setShowWorkloadIdle, showWorkloadSystem, setShowWorkloadSystem,
    pinnedFiles, setPinnedFiles, pinnedSheets, setPinnedSheets,
    activeDocumentFile, setActiveDocumentFile,
    documentTree, userOptions, segmentTypeOptions, invalidSheetCounts,
    ganttVisibleSegments, kpiData, filteredBaseSegments,
    flowRows, contributionRows, matrixRows, workloadContributors,
    refreshAll
  };
}
