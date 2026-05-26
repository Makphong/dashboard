import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Users, Server, Clock, Timer, RefreshCw, AlertTriangle, Star,
  Calendar, LayoutDashboard, Menu, X, FileText, FileSpreadsheet,
  Maximize2, SlidersHorizontal, Eye
} from 'lucide-react';
// Lib
import {
  FRONTEND_BUILD_VERSION,
  GANTT_DRILL_GROUP_LABELS,
  initialKpiData,
  SYSTEM_STAGE_FILTER_GROUPS,
  FLOW_INSIGHT_GROUPS,
  WORKFLOW_FLOW_SEGMENT_TYPES,
  CHART_PALETTE
} from './lib/constants.js';
import {
  toSegmentTypeLabel,
  isUserContextSegment,
  isIdleContextSegment,
  isProcessingEquivalentIdleSegment,
  toDrillGroup,
  toTimelineLane,
  formatDuration,
  formatPercent,
  safeNumber,
  percentile,
  toExcelDateTime,
  downloadExcelTable,
  toGanttSegmentTypeLabel,
  toDisplaySegmentTypeCode,
  toDisplayDate,
  buildSheetKey,
  extractFileNameFromSheetKey,
  buildKpisFromSegments,
  buildKpiData
} from './lib/utils.js';
import { requestJson } from './lib/api.js';

// Hooks
import { usePersistentState } from './hooks/usePersistentState.js';

// Shared Components
import { Sidebar } from './components/shared/Sidebar.jsx';
import { FilterPopover } from './components/shared/FilterPopover.jsx';
import { DropdownSearch } from './components/shared/DropdownSearch.jsx';
import { EmptyState } from './components/shared/EmptyState.jsx';
import { KpiSubtext } from './components/shared/KpiSubtext.jsx';

// Feature Components
import { GanttTimelineChart } from './features/timeline/GanttTimelineChart.jsx';
import { DataManagementView } from './features/data-management/DataManagementView.jsx';
import { DurationBarChart } from './features/charts/DurationBarChart.jsx';
import { DonutWorkloadChart } from './features/charts/DonutWorkloadChart.jsx';
import { UserContributionStackChart } from './features/charts/UserContributionStackChart.jsx';
import { ReworkMatrixScatterChart } from './features/charts/ReworkMatrixScatterChart.jsx';

function App() {
  const [sources, setSources] = useState([]);
  const [gsheetConnections, setGsheetConnections] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [backendWarning, setBackendWarning] = useState('');
  const [debugFetchError, setDebugFetchError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedGanttSegment, setSelectedGanttSegment] = useState(null);
  const [expandedVisualizationId, setExpandedVisualizationId] = useState('');
  
  const [ganttSingleLaneMode, setGanttSingleLaneMode] = usePersistentState('filter_ganttSingleLaneMode', false);
  const [showSystemLane, setShowSystemLane] = usePersistentState('filter_showSystemLane', true);
  const [showIdleLane, setShowIdleLane] = usePersistentState('filter_showIdleLane', true);
  const [showStarMarkers, setShowStarMarkers] = usePersistentState('filter_showStarMarkers', true);
  const [showGanttLegend, setShowGanttLegend] = usePersistentState('filter_showGanttLegend', true);
  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const timelineFilterRef = useRef(null);
  const [showWorkloadIdle, setShowWorkloadIdle] = usePersistentState('filter_showWorkloadIdle', false);
  const [showWorkloadSystem, setShowWorkloadSystem] = usePersistentState('filter_showWorkloadSystem', false);
  const [ganttCollapseGaps, setGanttCollapseGaps] = usePersistentState('filter_ganttCollapseGaps', false);
  const [showWorkloadFilterMenu, setShowWorkloadFilterMenu] = useState(false);
  const workloadFilterRef = useRef(null);

  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showIdle, setShowIdle] = usePersistentState('filter_showIdle', true);
  const [activeView, setActiveView] = useState('user-performance');
  const [openDropdown, setOpenDropdown] = useState('');
  const [datePreset, setDatePreset] = usePersistentState('filter_datePreset', 'all');
  const [dateStart, setDateStart] = usePersistentState('filter_dateStart', '');
  const [dateEnd, setDateEnd] = usePersistentState('filter_dateEnd', '');
  const [selectedFiles, setSelectedFiles] = usePersistentState('filter_selectedFiles', []);
  const [selectedSheets, setSelectedSheets] = usePersistentState('filter_selectedSheets', []);
  const [isFilterInitialized, setIsFilterInitialized] = usePersistentState('filter_isInitialized', false);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '');
  const [documentFileSearch, setDocumentFileSearch] = useState('');
  const [documentSheetSearch, setDocumentSheetSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = usePersistentState('filter_selectedUsers', []);
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedSegmentTypes, setSelectedSegmentTypes] = usePersistentState('filter_selectedSegmentTypes', []);
  const [segmentTypeSearchText, setSegmentTypeSearchText] = useState('');
  const [selectedSystemStages, setSelectedSystemStages] = usePersistentState('filter_selectedSystemStages', []);
  const [systemStageSearchText, setSystemStageSearchText] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(
    new URLSearchParams(window.location.search).get('debug') === '1'
  );
  const didInitDocumentDefaultRef = useRef(false);

  const segments = performance?.segments || [];

  const parsedSegments = useMemo(
    () => (
      segments
        .map((segment, idx) => {
          const startTs = Date.parse(segment.start || '');
          const endTsRaw = Date.parse(segment.end || '');
          if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return null;

          const [docFileFromId = '', docPageFromId = ''] = String(segment.documentId || '').split('::');
          const fileName = String(segment.fileName || docFileFromId || 'Unknown File');
          const pageName = String(segment.pageName || docPageFromId || '');
          const documentLabel = pageName ? `${fileName} / ${pageName}` : fileName;
          return {
            ...segment,
            id: segment.id || `${segment.segmentType || 'UNKNOWN'}-${idx}`,
            segmentType: String(segment.segmentType || 'UNKNOWN'),
            userName: String(segment.userName || 'Unknown User'),
            fileName,
            pageName,
            sheetKey: buildSheetKey(fileName, pageName),
            startTs,
            endTs: Math.max(endTsRaw, startTs + 1000),
            documentLabel,
          };
        })
        .filter(Boolean)
    ),
    [segments]
  );

  const datePresetOptions = useMemo(() => ([
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' },
  ]), []);
  const datePresetLabelMap = useMemo(
    () => Object.fromEntries(datePresetOptions.map((option) => [option.value, option.label])),
    [datePresetOptions]
  );

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

  const allDocumentFiles = useMemo(
    () => documentTree.map((item) => item.fileName),
    [documentTree]
  );

  const latestSourceFileName = useMemo(() => {
    if (!sources || sources.length === 0) return '';
    // core.py list_sources sorts by uploaded_at DESC, so sources[0] is latest
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
          if (Number.isFinite(startTs) && Number.isFinite(endTs) && startTs > endTs) {
            minTs = endTs;
            maxTs = startTs;
          } else {
            minTs = startTs;
            maxTs = endTs;
          }
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
      let hasSystemSegment = false;

      for (const seg of parsedSegments) {
        if (seg.endTs < minTs || seg.startTs > maxTs) continue;
        if (useSheetFilter) {
          if (!selectedSheetKeys.has(seg.sheetKey)) continue;
        } else if (!selectedFileNames.has(seg.fileName)) {
          continue;
        }

        const st = String(seg.segmentType || '');
        if (st.startsWith('USER_') && seg.userName) {
          names.add(seg.userName);
        } else if (st.startsWith('SYSTEM_') || st.startsWith('IDLE_')) {
          hasSystemSegment = true;
        }
      }
      if (hasSystemSegment) names.add('System');
      return Array.from(names).sort((a, b) => a.localeCompare(b));
    },
    [parsedSegments, selectedSheets, selectedFiles, datePreset, dateStart, dateEnd]
  );

  const segmentTypeOptions = useMemo(
    () => (
      Array.from(new Set(parsedSegments.map((segment) => segment.segmentType)))
        .sort((a, b) => a.localeCompare(b))
        .map((segmentType) => ({ value: segmentType, label: toSegmentTypeLabel(segmentType) }))
    ),
    [parsedSegments]
  );

  const systemStageOptions = useMemo(
    () => {
      let minTs = Number.NEGATIVE_INFINITY;
      let maxTs = Number.POSITIVE_INFINITY;
      if (parsedSegments.length > 0) {
        if (datePreset === 'custom') {
          const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
          const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
          if (Number.isFinite(startTs) && Number.isFinite(endTs) && startTs > endTs) {
            minTs = endTs;
            maxTs = startTs;
          } else {
            minTs = startTs;
            maxTs = endTs;
          }
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
      const availableTypes = new Set();

      for (const seg of parsedSegments) {
        if (seg.endTs < minTs || seg.startTs > maxTs) continue;
        if (useSheetFilter) {
          if (!selectedSheetKeys.has(seg.sheetKey)) continue;
        } else if (!selectedFileNames.has(seg.fileName)) {
          continue;
        }
        availableTypes.add(String(seg.segmentType || ''));
      }

      return SYSTEM_STAGE_FILTER_GROUPS.filter((group) => group.segmentTypes.some((type) => availableTypes.has(type)));
    },
    [parsedSegments, selectedSheets, selectedFiles, datePreset, dateStart, dateEnd]
  );

  const filteredDocumentFiles = useMemo(
    () => documentTree.filter((item) => item.fileName.toLowerCase().includes(documentFileSearch.trim().toLowerCase())),
    [documentTree, documentFileSearch]
  );

  const activeDocumentEntry = useMemo(
    () => documentTree.find((item) => item.fileName === activeDocumentFile) || null,
    [documentTree, activeDocumentFile]
  );

  const filteredSheetsForActiveFile = useMemo(() => {
    if (!activeDocumentEntry) return [];
    const q = documentSheetSearch.trim().toLowerCase();
    return activeDocumentEntry.sheets.filter((sheet) => sheet.toLowerCase().includes(q));
  }, [activeDocumentEntry, documentSheetSearch]);

  const filteredUserOptions = useMemo(
    () => userOptions.filter((userName) => userName.toLowerCase().includes(userSearchText.trim().toLowerCase())),
    [userOptions, userSearchText]
  );

  const filteredSegmentTypeOptions = useMemo(
    () => segmentTypeOptions.filter((option) => option.label.toLowerCase().includes(segmentTypeSearchText.trim().toLowerCase()) || option.value.toLowerCase().includes(segmentTypeSearchText.trim().toLowerCase())),
    [segmentTypeOptions, segmentTypeSearchText]
  );

  useEffect(() => {
    if (documentTree.length === 0) return;
    if (!documentTree.some((item) => item.fileName === activeDocumentFile)) {
      if (activeDocumentFile) setActiveDocumentFile('');
    }
  }, [documentTree, activeDocumentFile, setActiveDocumentFile]);

  useEffect(() => {
    if (documentTree.length === 0) return;
    const allFiles = documentTree.map((item) => item.fileName);
    const validFiles = new Set(allFiles);
    
    // 1. Clean up stale selections from localStorage
    setSelectedFiles((prev) => {
      const next = prev.filter((fileName) => validFiles.has(fileName));
      return next.length === prev.length ? prev : next;
    });
    
    const validSheets = new Set(
      documentTree.flatMap((item) => item.sheets.map((sheet) => buildSheetKey(item.fileName, sheet)))
    );
    setSelectedSheets((prev) => {
      const next = prev.filter((sheetKey) => validSheets.has(sheetKey));
      return next.length === prev.length ? prev : next;
    });

    // 2. Handle First-Time Default Selection
    if (!isFilterInitialized && !didInitDocumentDefaultRef.current && allFiles.length > 0) {
      didInitDocumentDefaultRef.current = true;
      setIsFilterInitialized(true); // Mark as initialized forever

      // If user hasn't jiggled with selections yet (brand new visit)
      if (selectedFiles.length === 0 && selectedSheets.length === 0) {
        if (latestSourceFileName && validFiles.has(latestSourceFileName)) {
          setSelectedFiles([latestSourceFileName]);
        } else {
          setSelectedFiles(allFiles);
        }
      }
    } else if (allFiles.length > 0) {
      didInitDocumentDefaultRef.current = true;
    }
  }, [documentTree, isFilterInitialized, latestSourceFileName, setSelectedFiles, setSelectedSheets, setIsFilterInitialized]);

  useEffect(() => {
    if (documentTree.length === 0) return;
    const validFiles = new Set(documentTree.map((item) => item.fileName));
    if (validFiles.size === 0) return;
    if (activeDocumentFile && validFiles.has(activeDocumentFile)) return;

    const firstSelected = selectedFiles.find((fileName) => validFiles.has(fileName));
    if (firstSelected) {
      setActiveDocumentFile(firstSelected);
      return;
    }
    setActiveDocumentFile(documentTree[0].fileName);
  }, [documentTree, selectedFiles, activeDocumentFile, setActiveDocumentFile]);

  useEffect(() => {
    if (userOptions.length === 0) return;
    const userSet = new Set(userOptions);
    setSelectedUsers((prev) => {
      const next = prev.filter((userName) => userSet.has(userName));
      return next.length === prev.length ? prev : next;
    });
  }, [userOptions, setSelectedUsers]);

  useEffect(() => {
    if (segmentTypeOptions.length === 0) return;
    const segmentSet = new Set(segmentTypeOptions.map((option) => option.value));
    setSelectedSegmentTypes((prev) => {
      const next = prev.filter((segmentType) => segmentSet.has(segmentType));
      return next.length === prev.length ? prev : next;
    });
  }, [segmentTypeOptions, setSelectedSegmentTypes]);

  useEffect(() => {
    if (systemStageOptions.length === 0) return;
    const stageSet = new Set(systemStageOptions.map((option) => option.value));
    setSelectedSystemStages((prev) => {
      const next = prev.filter((stage) => stageSet.has(stage));
      return next.length === prev.length ? prev : next;
    });
  }, [systemStageOptions, setSelectedSystemStages]);

  const explicitSelectedFileSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);
  const selectedSheetSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const effectiveSelectedFileSet = useMemo(() => {
    const merged = new Set(selectedFiles);
    selectedSheets.forEach((sheetKey) => {
      const fileName = extractFileNameFromSheetKey(sheetKey);
      if (fileName) merged.add(fileName);
    });
    return merged;
  }, [selectedFiles, selectedSheets]);
  const selectedUserSet = useMemo(() => new Set(selectedUsers), [selectedUsers]);
  const selectedSegmentTypeSet = useMemo(() => new Set(selectedSegmentTypes), [selectedSegmentTypes]);
  const selectedSystemStageSet = useMemo(() => new Set(selectedSystemStages), [selectedSystemStages]);

  const dateRangeBounds = useMemo(() => {
    if (parsedSegments.length === 0) {
      return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
    }
    if (datePreset === 'custom') {
      const startTs = dateStart ? Date.parse(`${dateStart}T00:00:00`) : Number.NEGATIVE_INFINITY;
      const endTs = dateEnd ? Date.parse(`${dateEnd}T23:59:59.999`) : Number.POSITIVE_INFINITY;
      if (Number.isFinite(startTs) && Number.isFinite(endTs) && startTs > endTs) {
        return { minTs: endTs, maxTs: startTs };
      }
      return { minTs: startTs, maxTs: endTs };
    }
    if (datePreset === 'all') {
      return { minTs: Number.NEGATIVE_INFINITY, maxTs: Number.POSITIVE_INFINITY };
    }
    const latestEndTs = parsedSegments.reduce((maxTs, segment) => Math.max(maxTs, segment.endTs), parsedSegments[0].endTs);
    const dayWindowMap = { '7d': 7, '30d': 30, '90d': 90 };
    const windowDays = dayWindowMap[datePreset] || 30;
    return {
      minTs: latestEndTs - (windowDays * 24 * 60 * 60 * 1000),
      maxTs: latestEndTs,
    };
  }, [parsedSegments, datePreset, dateStart, dateEnd]);

  const hasCustomDateInput = Boolean(dateStart || dateEnd);

  const filteredBaseSegments = useMemo(() => {
    if (parsedSegments.length === 0) return [];
    if (explicitSelectedFileSet.size === 0 && selectedSheetSet.size === 0) return [];

    return parsedSegments.filter((segment) => {
      if (segment.endTs < dateRangeBounds.minTs || segment.startTs > dateRangeBounds.maxTs) return false;

      if (selectedSheetSet.size > 0) {
        if (!selectedSheetSet.has(segment.sheetKey)) return false;
      } else if (!explicitSelectedFileSet.has(segment.fileName)) {
        return false;
      }
      if (selectedUserSet.size > 0) {
        const segType = String(segment.segmentType || '');
        const isUserSegment = isUserContextSegment(segType, segment.userName);
        if (isUserSegment) {
          if (!selectedUserSet.has(segment.userName)) return false;
        } else {
          if (!selectedUserSet.has('System')) return false;
        }
      }
      return true;
    });
  }, [parsedSegments, dateRangeBounds, explicitSelectedFileSet, selectedSheetSet, selectedUserSet]);

  const systemBaseSegments = useMemo(() => {
    if (parsedSegments.length === 0) return [];
    if (explicitSelectedFileSet.size === 0 && selectedSheetSet.size === 0) return [];

    return parsedSegments.filter((segment) => {
      if (segment.endTs < dateRangeBounds.minTs || segment.startTs > dateRangeBounds.maxTs) return false;
      if (selectedSheetSet.size > 0) {
        if (!selectedSheetSet.has(segment.sheetKey)) return false;
      } else if (!explicitSelectedFileSet.has(segment.fileName)) {
        return false;
      }
      return true;
    });
  }, [parsedSegments, dateRangeBounds, explicitSelectedFileSet, selectedSheetSet]);

  const ganttVisibleSegments = useMemo(() => (
    filteredBaseSegments.filter((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!showIdle && isIdleContextSegment(segmentType)) return false;
      if (selectedSegmentTypeSet.size > 0 && !selectedSegmentTypeSet.has(segmentType)) {
        return false;
      }
      return true;
    })
  ), [filteredBaseSegments, showIdle, selectedSegmentTypeSet]);

  const visibleKpis = useMemo(
    () => (ganttVisibleSegments.length > 0 ? buildKpisFromSegments(ganttVisibleSegments) : null),
    [ganttVisibleSegments]
  );

  const kpiData = useMemo(
    () => (visibleKpis ? buildKpiData(visibleKpis) : initialKpiData),
    [visibleKpis]
  );

  const flowRows = useMemo(() => {
    const groupedByDocument = new Map();
    filteredBaseSegments.forEach((segment) => {
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

        if (
          currentType === 'SYSTEM_SCHEDULED_REPROCESSING'
          || currentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
        ) {
          reprocessIndices.push(idx);
        }

        if (currentType === 'SYSTEM_INITIAL_PROCESSING') {
          const nextUserIdx = sorted.findIndex((candidate, candidateIdx) => (
            candidateIdx > idx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
          ));
          if (nextUserIdx > idx) {
            const next = sorted[nextUserIdx];
            addMetric(
              'processing-round-1-to-user',
              (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000
            );
          }
        }

        if (USER_ACTION_TYPES.has(currentType)) {
          const nextUserStepIdx = sorted.findIndex((candidate, candidateIdx) => (
            candidateIdx > idx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
          ));
          if (nextUserStepIdx > idx) {
            const next = sorted[nextUserStepIdx];
            addMetric(
              'user-review-edit-to-next-user-step',
              (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000
            );
          }
        }
      }

      let round2AnchorIdx = sorted.findIndex(
        (segment) => String(segment.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
      );
      if (round2AnchorIdx < 0) {
        round2AnchorIdx = reprocessIndices.length >= 2 ? reprocessIndices[1] : -1;
      }
      if (round2AnchorIdx < 0) {
        round2AnchorIdx = sorted.findIndex((segment, idx) => {
          const type = String(segment.segmentType || '');
          if (
            type !== 'IDLE_AFTER_SYSTEM_REPROCESS'
            && type !== 'IDLE_WAITING_FOR_REREVIEW'
            && type !== 'POST_COMPLETED_ELAPSED'
          ) {
            return false;
          }
          return reprocessIndices.some((reprocessIdx) => reprocessIdx < idx);
        });
      }

      if (round2AnchorIdx >= 0) {
        const nextUserIdx = sorted.findIndex((candidate, candidateIdx) => (
          candidateIdx > round2AnchorIdx && USER_ACTION_TYPES.has(String(candidate.segmentType || ''))
        ));
        if (nextUserIdx > round2AnchorIdx) {
          const anchorSegment = sorted[round2AnchorIdx];
          const next = sorted[nextUserIdx];
          const anchorType = String(anchorSegment.segmentType || '');
          let anchorEndTs = safeNumber(anchorSegment.endTs);

          if (
            anchorType === 'IDLE_AFTER_SYSTEM_REPROCESS'
            || anchorType === 'IDLE_WAITING_FOR_REREVIEW'
            || anchorType === 'POST_COMPLETED_ELAPSED'
          ) {
            const priorReprocessIdx = [...reprocessIndices].reverse().find(
              (reprocessIdx) => reprocessIdx < round2AnchorIdx
            );
            if (Number.isInteger(priorReprocessIdx)) {
              anchorEndTs = safeNumber(sorted[priorReprocessIdx].endTs);
            }
          }

          addMetric(
            'processing-round-2-to-user',
            (safeNumber(next.startTs) - anchorEndTs) / 1000,
            { capSeconds: 0 }
          );
        }
      }

      const firstUpload = sorted.find((segment) => String(segment.segmentType || '') === 'USER_UPLOADING');
      const completedSegments = sorted.filter((segment) => COMPLETE_TYPES.has(String(segment.segmentType || '')));
      const latestComplete = completedSegments.length > 0 ? completedSegments[completedSegments.length - 1] : null;
      if (firstUpload && latestComplete && safeNumber(latestComplete.endTs) >= safeNumber(firstUpload.startTs)) {
        addMetric(
          'upload-to-latest-complete',
          (safeNumber(latestComplete.endTs) - safeNumber(firstUpload.startTs)) / 1000,
          { capSeconds: 0 }
        );
      }
    });

    return FLOW_INSIGHT_GROUPS.map((group) => {
      const stats = statsById[group.id] || { totalSeconds: 0, count: 0, minSeconds: null, maxSeconds: null };
      return {
        transitionKey: group.id,
        transitionLabel: group.label,
        transitionDescription: group.description,
        count: stats.count,
        totalSeconds: stats.totalSeconds,
        avgSeconds: stats.count > 0 ? stats.totalSeconds / stats.count : 0,
        minSeconds: stats.count > 0 ? safeNumber(stats.minSeconds) : 0,
        maxSeconds: stats.count > 0 ? safeNumber(stats.maxSeconds) : 0,
      };
    });
  }, [filteredBaseSegments]);

  const toggleSelectedValue = (setter, value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const toggleFileSelection = (fileName, currentlyChecked = false) => {
    if (currentlyChecked) {
      setSelectedFiles((prev) => prev.filter((item) => item !== fileName));
      setSelectedSheets((prev) => prev.filter((sheetKey) => extractFileNameFromSheetKey(sheetKey) !== fileName));
      return;
    }
    setSelectedFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
  };

  const toggleSheetSelection = (fileName, sheetName) => {
    const sheetKey = buildSheetKey(fileName, sheetName);
    const nextSheets = selectedSheets.includes(sheetKey)
      ? selectedSheets.filter((item) => item !== sheetKey)
      : [...selectedSheets, sheetKey];
    setSelectedSheets(nextSheets);
    if (nextSheets.length === 0) {
      setSelectedFiles(allDocumentFiles);
    }
  };

  const toggleUserSelection = (userName) => {
    toggleSelectedValue(setSelectedUsers, userName);
  };

  const toggleSegmentTypeSelection = (segmentType) => {
    toggleSelectedValue(setSelectedSegmentTypes, segmentType);
  };

  const userStatsRows = useMemo(() => {
    const userStatsMap = new Map();
    ganttVisibleSegments.forEach((segment) => {
      const userName = String(segment.userName || '');
      if (!userName || userName.toLowerCase() === 'system') return;
      if (!String(segment.segmentType || '').startsWith('USER_')) return;

      const durationSeconds = safeNumber(segment.durationSeconds);
      if (!userStatsMap.has(userName)) {
        userStatsMap.set(userName, {
          user: userName,
          totalSeconds: 0,
          reviewSeconds: 0,
          editSeconds: 0,
          completeSeconds: 0,
          uploadSeconds: 0,
          sessionCount: 0,
          reworkCount: 0,
          autoClosedCount: 0,
          documents: new Set(),
        });
      }

      const stats = userStatsMap.get(userName);
      stats.totalSeconds += durationSeconds;
      stats.documents.add(segment.sheetKey || segment.documentId || segment.fileName || userName);

      if (segment.segmentType === 'USER_UPLOADING') {
        stats.uploadSeconds += durationSeconds;
        return;
      }

      stats.sessionCount += 1;

      if (segment.segmentType === 'USER_EDITING_CORRECTION') {
        stats.editSeconds += durationSeconds;
        stats.reworkCount += 1;
      } else if (segment.segmentType === 'USER_COMPLETION_APPROVAL') {
        stats.completeSeconds += durationSeconds;
      } else {
        stats.reviewSeconds += durationSeconds;
      }

      if (segment.autoTimeout || segment.segmentType === 'USER_REVIEW_AUTO_TIMEOUT') {
        stats.autoClosedCount += 1;
      }
    });

    return Array.from(userStatsMap.values())
      .map((stats) => {
        const docCount = Math.max(1, stats.documents.size);
        return {
          user: stats.user,
          totalSeconds: stats.totalSeconds,
          reviewSeconds: stats.reviewSeconds,
          editSeconds: stats.editSeconds,
          completeSeconds: stats.completeSeconds,
          uploadSeconds: stats.uploadSeconds,
          reworkRate: stats.sessionCount > 0 ? stats.reworkCount / stats.sessionCount : 0,
          autoClosedRate: stats.sessionCount > 0 ? stats.autoClosedCount / stats.sessionCount : 0,
          avgTimePerDocSeconds: stats.totalSeconds / docCount,
          sessionCount: stats.sessionCount,
        };
      })
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [ganttVisibleSegments]);

  const contributionRows = useMemo(
    () => userStatsRows.map((row) => ({
      user: row.user,
      totalSeconds: row.totalSeconds,
      reviewSeconds: row.reviewSeconds,
      editSeconds: row.editSeconds,
      completeSeconds: row.completeSeconds,
      uploadSeconds: row.uploadSeconds,
      reworkRate: row.reworkRate,
    })),
    [userStatsRows]
  );

  const matrixRows = useMemo(
    () => userStatsRows.map((row) => ({
      user: row.user,
      avgTimePerDocSeconds: row.avgTimePerDocSeconds,
      reworkRate: row.reworkRate,
      autoClosedRate: row.autoClosedRate,
      totalActiveSeconds: row.totalSeconds,
    })),
    [userStatsRows]
  );

  useEffect(() => {
    setSelectedGanttSegment(null);
  }, [datePreset, dateStart, dateEnd, selectedFiles, selectedSheets, selectedUsers, selectedSegmentTypes, selectedSystemStages, showIdle, activeView]);

  useEffect(() => {
    setOpenDropdown('');
  }, [activeView]);

  useEffect(() => {
    setExpandedVisualizationId('');
  }, [activeView]);

  useEffect(() => {
    if (!showTimelineFilterMenu) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') { setShowTimelineFilterMenu(false); return; }
      if (timelineFilterRef.current && timelineFilterRef.current.contains(e.target)) return;
      setShowTimelineFilterMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [showTimelineFilterMenu]);

  useEffect(() => {
    if (!showWorkloadFilterMenu) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') { setShowWorkloadFilterMenu(false); return; }
      if (workloadFilterRef.current && workloadFilterRef.current.contains(e.target)) return;
      setShowWorkloadFilterMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [showWorkloadFilterMenu]);

  const workloadContributors = useMemo(() => {
    const laneDurationMap = new Map();
    ganttVisibleSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      const durationSeconds = safeNumber(segment.durationSeconds);
      if (durationSeconds <= 0) return;

      let lane = toTimelineLane(segmentType, segment.userName);
      if (segmentType.startsWith('SYSTEM_')) lane = 'System';
      if (isIdleContextSegment(segmentType)) lane = 'Idle';
      if (lane === 'Idle' && !isIdleContextSegment(segmentType)) return;
      if (!showWorkloadIdle && lane === 'Idle') return;
      if (!showWorkloadSystem && lane === 'System') return;

      laneDurationMap.set(lane, (laneDurationMap.get(lane) || 0) + durationSeconds);
    });

    if (showWorkloadIdle && visibleKpis) {
      const idleSeconds = safeNumber(visibleKpis.idleWaitingSeconds);
      if (idleSeconds > 0) {
        laneDurationMap.set('Idle', idleSeconds);
      } else {
        laneDurationMap.delete('Idle');
      }
    }

    const rows = Array.from(laneDurationMap.entries())
      .map(([user, totalSeconds]) => ({ user, totalSeconds }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);

    const total = rows.reduce((sum, row) => sum + row.totalSeconds, 0);
    if (total <= 0) return [];
    return rows.map((row) => ({
      ...row,
      share: row.totalSeconds / total,
    }));
  }, [ganttVisibleSegments, showWorkloadIdle, showWorkloadSystem, visibleKpis]);

  const exportTimelineExcel = () => {
    if (ganttVisibleSegments.length === 0) return;

    const columns = [
      { key: 'no', label: 'No.' },
      { key: 'lane', label: 'Lane' },
      { key: 'userName', label: 'User' },
      { key: 'group', label: 'Timeline Group' },
      { key: 'segmentLabel', label: 'Segment' },
      { key: 'segmentType', label: 'Segment Type' },
      { key: 'start', label: 'Start Time' },
      { key: 'end', label: 'End Time' },
      { key: 'duration', label: 'Duration' },
      { key: 'durationSeconds', label: 'Duration Seconds' },
      { key: 'documentId', label: 'Document ID' },
      { key: 'fileName', label: 'File' },
      { key: 'pageName', label: 'Page' },
      { key: 'autoTimeout', label: 'Auto Timeout' },
    ];
    const rows = [...ganttVisibleSegments]
      .sort((a, b) => safeNumber(a.startTs) - safeNumber(b.startTs))
      .map((segment, idx) => {
        const segmentType = String(segment.segmentType || 'UNKNOWN');
        const drillGroup = toDrillGroup(segmentType);
        return {
          no: idx + 1,
          lane: ganttSingleLaneMode ? 'All user' : toTimelineLane(segmentType, segment.userName),
          userName: segment.userName || '',
          group: GANTT_DRILL_GROUP_LABELS[drillGroup] || drillGroup,
          segmentLabel: toGanttSegmentTypeLabel(segmentType),
          segmentType,
          start: toExcelDateTime(segment.start),
          end: toExcelDateTime(segment.end),
          duration: formatDuration(segment.durationSeconds),
          durationSeconds: Math.round(safeNumber(segment.durationSeconds)),
          documentId: segment.documentId || '',
          fileName: segment.fileName || '',
          pageName: segment.pageName || '',
          autoTimeout: segment.autoTimeout ? 'Yes' : '',
        };
      });
    const stamp = toExcelDateTime(new Date()).replace(/[: ]/g, '-');
    const laneSuffix = ganttSingleLaneMode ? 'all-lane' : 'by-lane';
    downloadExcelTable(
      `timeline-${laneSuffix}-${stamp}.xls`,
      ganttSingleLaneMode ? 'Timeline - All user lane' : 'Timeline by User',
      columns,
      rows
    );
  };

  const suspiciousZeroState = useMemo(() => {
    const summaryRows = Number(performance?.summary?.rows || 0);
    const activeSeconds = Number(performance?.kpis?.activeUserTimeSeconds || 0);
    const normalizedWithStatus = Number(debugInfo?.parseStats?.normalizedEventsWithToStatus || 0);
    return summaryRows > 0 && activeSeconds === 0 && normalizedWithStatus === 0;
  }, [performance, debugInfo]);

  const visualizationMeta = {
    gantt: {
      title: 'Timeline by User',
      subtitle: 'User activity and waiting windows across time',
    },
    donut: {
      title: 'Workload Share by User',
      subtitle: 'Active-time share of all contributors',
    },
    contribution: {
      title: 'Top User Work Mix',
      subtitle: 'Compare Review / Edit / Complete time by user',
    },
    flow: {
      title: 'Step Delay Analysis',
      subtitle: '4 key workflow delays',
    },
    matrix: {
      title: 'Quality vs Edit by User',
      subtitle: 'Avg time per document versus edit rate',
    },
  };

  const renderExpandedVisualization = () => {
    if (expandedVisualizationId === 'gantt') {
      if (ganttVisibleSegments.length === 0) {
        return (
          <EmptyState
            icon={LayoutDashboard}
            title="No Segment Data"
            subtitle="Upload an Audit Log file to generate Gantt segments"
          />
        );
      }
      return (
        <GanttTimelineChart
          segments={ganttVisibleSegments}
          onSelectSegment={setSelectedGanttSegment}
          expanded
          singleLane={ganttSingleLaneMode}
          showSystemLane={showSystemLane}
          showIdleLane={showIdleLane}
          showStarMarkers={showStarMarkers}
          collapseGaps={ganttCollapseGaps}
          showGanttLegend={showGanttLegend}
        />
      );
    }

    if (expandedVisualizationId === 'donut') {
      if (workloadContributors.length === 0) {
        return (
          <EmptyState
            icon={Users}
            title="No Contribution Data"
            subtitle="No active time was found in the uploaded data"
          />
        );
      }
      return <DonutWorkloadChart rows={workloadContributors} expanded />;
    }

    if (expandedVisualizationId === 'contribution') {
      if (contributionRows.length === 0) {
        return (
          <EmptyState
            icon={Users}
            title="No Ranking Data"
            subtitle="No user sessions are available for ranking"
          />
        );
      }
      return <UserContributionStackChart rows={contributionRows} maxVisibleRows={12} />;
    }

    if (expandedVisualizationId === 'flow') {
      if (flowRows.length === 0) {
        return (
          <EmptyState
            icon={RefreshCw}
            title="No Flow Data"
            subtitle="No valid transition delays found from current filters"
          />
        );
      }
      return (
        <DurationBarChart
          rows={flowRows.map((row) => ({
            id: row.transitionKey,
            label: row.transitionLabel,
            value: row.avgSeconds,
            minValue: row.minSeconds,
            maxValue: row.maxSeconds,
            valueLabel: row.count > 0 ? `${formatDuration(row.avgSeconds)} avg` : 'no data',
            meta: row.count > 0
              ? `Min ${formatDuration(row.minSeconds)} | Max ${formatDuration(row.maxSeconds)}`
              : 'Min - | Max -',
          }))}
          maxVisibleRows={4}
        />
      );
    }

    if (expandedVisualizationId === 'matrix') {
      if (matrixRows.length === 0) {
        return (
          <EmptyState
            icon={Search}
            title="No Matrix Data"
            subtitle="No data is available to compute the Edit Matrix"
          />
        );
      }
      return <ReworkMatrixScatterChart rows={matrixRows} expanded />;
    }

    return null;
  };

  const refreshAll = async (options = {}) => {
    setLoading(true);
    setErrorMessage('');
    setBackendWarning('');
    setDebugFetchError('');
    try {
      setSyncing(true);
      const syncRes = await requestJson('/api/gsheet/sync', { method: 'POST' }).catch((e) => ({ __error: e.message }));
      setSyncing(false);
      if (syncRes && !syncRes.__error && syncRes.connections) {
        setGsheetConnections(syncRes.connections || []);
      }

      const shouldFetchDebug = Boolean(options.includeDebug || showDebugPanel);
      const debugPromise = shouldFetchDebug
        ? requestJson('/api/debug').catch((error) => ({ __error: error.message || 'debug failed' }))
        : Promise.resolve(null);
      const [sourcesRes, performanceRes, healthRes, debugRes, connectionsRes] = await Promise.all([
        requestJson('/api/sources'),
        requestJson('/api/user-performance'),
        requestJson('/api/health').catch((error) => ({ __error: error.message || 'health failed' })),
        debugPromise,
        requestJson('/api/gsheet/connections').catch(() => ({ connections: [] })),
      ]);
      setSources(sourcesRes.sources || []);
      setPerformance(performanceRes || null);
      setGsheetConnections(connectionsRes.connections || []);

      if (healthRes?.__error) {
        setHealthInfo(null);
        setBackendWarning(`Health endpoint failed: ${healthRes.__error}`);
      } else {
        setHealthInfo(healthRes || null);
        if (!healthRes?.version) {
          setBackendWarning('Backend is missing version metadata (likely old process).');
        }
      }

      if (shouldFetchDebug) {
        if (debugRes?.__error) {
          setDebugInfo(null);
          setDebugFetchError(debugRes.__error);
        } else {
          setDebugInfo(debugRes || null);
        }
      } else {
        setDebugInfo(null);
        setDebugFetchError('');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load data');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const handleUploadFiles = async (files) => {
    setUploading(true);
    setErrorMessage('');
    try {
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64Part = result.split(',')[1] || '';
          resolve({ name: file.name, contentBase64: base64Part });
        };
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsDataURL(file);
      });

      const payloadFiles = await Promise.all(files.map(toBase64));
      await requestJson('/api/upload', {
        method: 'POST',
        body: JSON.stringify({ files: payloadFiles }),
      });
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    setErrorMessage('');
    try {
      await requestJson(`/api/sources/${encodeURIComponent(sourceId)}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message || 'Delete failed');
    }
  };

  const handleConnectGSheet = async (url) => {
    setErrorMessage('');
    const res = await requestJson('/api/gsheet/connect', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    if (res.error) throw new Error(res.error);
    if (res.connections) setGsheetConnections(res.connections);
    await refreshAll();
  };

  const handleDisconnectGSheet = async (connectionId) => {
    setErrorMessage('');
    try {
      const res = await requestJson(`/api/gsheet/${encodeURIComponent(connectionId)}`, { method: 'DELETE' });
      if (res.connections) setGsheetConnections(res.connections);
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message || 'Disconnect failed');
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      <Sidebar
        isMobileOpen={isMobileOpen}
        setMobileOpen={setMobileOpen}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!isSidebarCollapsed)}
        activeView={activeView}
        setActiveView={setActiveView}
      />
      {isMobileOpen ? (
        <button
          className="fixed inset-0 z-40 bg-slate-900/35 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar overlay"
        ></button>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-[72px] bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center px-4 md:px-8 gap-3 flex-shrink-0 z-20">
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-3 overflow-x-auto overflow-y-visible no-scrollbar pb-1 md:pb-0">
            <FilterPopover
              id="date"
              title="Date Range"
              summary={datePreset !== 'custom' ? (datePresetLabelMap[datePreset] || 'All Time') : (dateStart || dateEnd ? `${dateStart || '...'} - ${dateEnd || '...'}` : 'Not set')}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              icon={Calendar}
              active={datePreset !== 'all' || datePreset === 'custom'}
              minWidthClass="min-w-[210px]"
              panelClassName="w-[370px] max-w-[90vw]"
            >
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {datePresetOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setDatePreset(option.value);
                        setDateStart('');
                        setDateEnd('');
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left
                        ${datePreset === option.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Custom Range</div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1">
                      <div className="text-[11px] text-slate-500">Start</div>
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(event) => {
                          setDatePreset('custom');
                          setDateStart(event.target.value);
                        }}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      />
                    </label>
                    <label className="space-y-1">
                      <div className="text-[11px] text-slate-500">End</div>
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(event) => {
                          setDatePreset('custom');
                          setDateEnd(event.target.value);
                        }}
                        className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                      />
                    </label>
                  </div>
                  {datePreset === 'custom' && hasCustomDateInput ? (
                    <button
                      onClick={() => {
                        setDatePreset('all');
                        setDateStart('');
                        setDateEnd('');
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Revert To All Time
                    </button>
                  ) : null}
                </div>
              </div>
            </FilterPopover>

            <FilterPopover
              id="document"
              title="Document"
              summary={effectiveSelectedFileSet.size === 0 && selectedSheets.length === 0 ? 'No Document' : (selectedSheets.length > 0 ? `${selectedSheets.length} Sheets` : `${effectiveSelectedFileSet.size} Files`)}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              icon={FileText}
              active={effectiveSelectedFileSet.size > 0 || selectedSheets.length > 0}
              minWidthClass="min-w-[230px]"
              panelClassName="w-[760px] max-w-[92vw]"
            >
              <div className="p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Files</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFiles(Array.from(new Set([...selectedFiles, ...filteredDocumentFiles.map((item) => item.fileName)])))}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedFiles([])}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <DropdownSearch
                      value={documentFileSearch}
                      onChange={setDocumentFileSearch}
                      placeholder="Search file..."
                    />
                    <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1 pr-1">
                      {filteredDocumentFiles.length === 0 ? (
                        <div className="text-xs text-slate-400 px-1 py-2">No files found</div>
                      ) : (
                        filteredDocumentFiles.map((item) => {
                          const checked = explicitSelectedFileSet.has(item.fileName);
                          const active = activeDocumentFile === item.fileName;
                          return (
                            <button
                              key={item.fileName}
                              onClick={() => setActiveDocumentFile(item.fileName)}
                              className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors
                                ${active ? 'border-blue-200 bg-blue-50/80' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                            >
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleFileSelection(item.fileName, checked)}
                                  onClick={(event) => event.stopPropagation()}
                                  className="h-4 w-4 accent-blue-600 rounded"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-slate-700 truncate">{item.fileName}</div>
                                  <div className="text-[11px] text-slate-500">{item.sheets.length} sheets</div>
                                </div>
                              </label>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 space-y-2 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Sheets {activeDocumentEntry ? `(${activeDocumentEntry.fileName})` : ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (!activeDocumentEntry) return;
                            const keys = filteredSheetsForActiveFile.map((sheetName) => buildSheetKey(activeDocumentEntry.fileName, sheetName));
                            setSelectedSheets(Array.from(new Set([...selectedSheets, ...keys])));
                          }}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => {
                            if (!activeDocumentEntry) return;
                            const nextSheets = selectedSheets.filter((sheetKey) => !sheetKey.startsWith(`${activeDocumentEntry.fileName}::`));
                            setSelectedSheets(nextSheets);
                          }}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <DropdownSearch
                      value={documentSheetSearch}
                      onChange={setDocumentSheetSearch}
                      placeholder="Search sheet..."
                    />
                    <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1 pr-1">
                      {!activeDocumentEntry ? (
                        <div className="text-xs text-slate-400 px-1 py-2">Select a file first</div>
                      ) : filteredSheetsForActiveFile.length === 0 ? (
                        <div className="text-xs text-slate-400 px-1 py-2">No sheets found</div>
                      ) : (
                        filteredSheetsForActiveFile.map((sheetName) => {
                          const sheetKey = buildSheetKey(activeDocumentEntry.fileName, sheetName);
                          return (
                            <label key={sheetKey} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSheetSet.has(sheetKey)}
                                onChange={() => toggleSheetSelection(activeDocumentEntry.fileName, sheetName)}
                                className="h-4 w-4 accent-blue-600 rounded"
                              />
                              <span className="text-sm text-slate-700 truncate">{sheetName}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </FilterPopover>

            <FilterPopover
              id="user"
              title="User"
              summary={selectedUsers.length === 0 ? 'All Users' : `${selectedUsers.length} Users`}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              icon={Users}
              active={selectedUsers.length > 0}
              minWidthClass="min-w-[190px]"
              panelClassName="w-[350px] max-w-[90vw]"
            >
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Users</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedUsers(Array.from(new Set([...selectedUsers, ...filteredUserOptions])))}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedUsers([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <DropdownSearch
                  value={userSearchText}
                  onChange={setUserSearchText}
                  placeholder="Search user..."
                />
                <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1 pr-1">
                  {filteredUserOptions.length === 0 ? (
                    <div className="text-xs text-slate-400 px-1 py-2">No users found</div>
                  ) : (
                    filteredUserOptions.map((userName) => (
                      <label key={userName} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUserSet.has(userName)}
                          onChange={() => toggleUserSelection(userName)}
                          className="h-4 w-4 accent-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-700 truncate">{userName}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </FilterPopover>

            <FilterPopover
              id="segment-type"
              title="Segment"
              summary={selectedSegmentTypes.length === 0 ? 'Segment Type' : `${selectedSegmentTypes.length} Types`}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              icon={LayoutDashboard}
              active={selectedSegmentTypes.length > 0}
              minWidthClass="min-w-[210px]"
              panelClassName="w-[380px] max-w-[92vw]"
            >
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Segment Type</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSegmentTypes(Array.from(new Set([...selectedSegmentTypes, ...filteredSegmentTypeOptions.map((item) => item.value)])))}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedSegmentTypes([])}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <DropdownSearch
                  value={segmentTypeSearchText}
                  onChange={setSegmentTypeSearchText}
                  placeholder="Search segment..."
                />
                <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1 pr-1">
                  {filteredSegmentTypeOptions.length === 0 ? (
                    <div className="text-xs text-slate-400 px-1 py-2">No segment types found</div>
                  ) : (
                    filteredSegmentTypeOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSegmentTypeSet.has(option.value)}
                          onChange={() => toggleSegmentTypeSelection(option.value)}
                          className="h-4 w-4 accent-blue-600 rounded"
                        />
                        <div className="min-w-0 text-sm font-medium text-slate-700 truncate">{option.label}</div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </FilterPopover>

            <div className="ml-auto flex items-center gap-4 pl-4 border-l border-slate-200">
              <button
                onClick={() => refreshAll()}
                disabled={loading || syncing}
                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || syncing) ? 'animate-spin' : ''}`} />
                {loading || syncing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative">
          {errorMessage && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          
          {activeView === 'data-management' ? (
            <DataManagementView
              sources={sources}
              onUploadFiles={handleUploadFiles}
              onDeleteSource={handleDeleteSource}
              onConnectGSheet={handleConnectGSheet}
              onDisconnectGSheet={handleDisconnectGSheet}
              gsheetConnections={gsheetConnections}
              uploading={uploading}
              syncing={syncing}
            />
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-5 sm:space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {kpiData.map((kpi, idx) => (
                  <div
                    key={kpi.id}
                    className="card-rise-in bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)]"
                    style={{ animationDelay: `${idx * 45}ms` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                        <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                      </div>
                    </div>
                    <div className="text-slate-500 text-sm font-semibold mb-1">{kpi.label}</div>
                    <div className="text-[2rem] sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{kpi.value}</div>
                    <KpiSubtext text={kpi.subtext} />
                  </div>
                ))}
              </div>

              <div className="group relative z-20 card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 overflow-visible">
                <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
                  <button
                    onClick={() => setShowExportConfirm(true)}
                    disabled={ganttVisibleSegments.length === 0}
                    className="h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
                    title="Export timeline to Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <div className="relative" ref={timelineFilterRef}>
                    <button
                      onClick={() => setShowTimelineFilterMenu((prev) => !prev)}
                      className={`h-7 w-7 rounded-md border transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${(!showSystemLane || !showIdleLane || !showStarMarkers || ganttSingleLaneMode) ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400 hover:text-slate-600'}`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 mx-auto" />
                    </button>
                    {showTimelineFilterMenu && (
                      <div className="dropdown-slide-enter absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-30">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Options</div>
                        {[
                          { label: 'Single Lane', active: ganttSingleLaneMode, toggle: () => setGanttSingleLaneMode((p) => !p), icon: Users },
                          { label: 'System Lane', active: showSystemLane, toggle: () => setShowSystemLane((p) => !p), icon: Server },
                          { label: 'Idle Lane', active: showIdleLane, toggle: () => setShowIdleLane((p) => !p), icon: Clock },
                          { label: 'Complete Stars', active: showStarMarkers, toggle: () => setShowStarMarkers((p) => !p), icon: Star },
                          { label: 'Collapse Gaps', active: ganttCollapseGaps, toggle: () => setGanttCollapseGaps((p) => !p), icon: Timer },
                          { label: 'Show Legend', active: showGanttLegend, toggle: () => setShowGanttLegend((p) => !p), icon: Eye },
                        ].map((opt) => (
                          <button key={opt.label} onClick={opt.toggle} className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                            <div className={`w-8 h-[18px] rounded-full relative ${opt.active ? 'bg-blue-500' : 'bg-slate-200'}`}>
                              <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${opt.active ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                            </div>
                            <span className="text-slate-700 font-medium">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setExpandedVisualizationId('gantt')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-400 opacity-100 md:opacity-0 md:group-hover:opacity-100"><Maximize2 className="w-3.5 h-3.5 mx-auto" /></button>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-6">Timeline by User</h2>
                {ganttVisibleSegments.length === 0 ? (
                  <EmptyState icon={LayoutDashboard} title="No Segment Data" subtitle="Select document filters to see timeline" />
                ) : (
                  <GanttTimelineChart
                    segments={ganttVisibleSegments}
                    onSelectSegment={setSelectedGanttSegment}
                    singleLane={ganttSingleLaneMode}
                    showSystemLane={showSystemLane}
                    showIdleLane={showIdleLane}
                    showStarMarkers={showStarMarkers}
                    collapseGaps={ganttCollapseGaps}
                    showGanttLegend={showGanttLegend}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 lg:col-span-2 lg:h-[430px] flex flex-col">
                   <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
                    <div className="relative" ref={workloadFilterRef}>
                      <button onClick={() => setShowWorkloadFilterMenu(!showWorkloadFilterMenu)} className="h-7 w-7 rounded-md border border-slate-200 text-slate-400"><SlidersHorizontal className="w-3.5 h-3.5 mx-auto" /></button>
                      {showWorkloadFilterMenu && (
                        <div className="dropdown-slide-enter absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 z-30">
                          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Display Options</div>
                          {[
                            { label: 'Idle Time', active: showWorkloadIdle, toggle: () => setShowWorkloadIdle(!showWorkloadIdle), icon: Clock },
                            { label: 'System Time', active: showWorkloadSystem, toggle: () => setShowWorkloadSystem(!showWorkloadSystem), icon: Server },
                          ].map((opt) => (
                            <button key={opt.label} onClick={opt.toggle} className="flex items-center gap-2.5 w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                              <div className={`w-8 h-[18px] rounded-full relative ${opt.active ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-transform ${opt.active ? 'translate-x-[16px]' : 'translate-x-[2px]'}`} />
                              </div>
                              <span className="text-slate-700 font-medium">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => setExpandedVisualizationId('donut')} className="h-7 w-7 rounded-md border border-slate-200 text-slate-400"><Maximize2 className="w-3.5 h-3.5 mx-auto" /></button>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Workload Share by User</h2>
                  <div className="mt-4 flex-1 min-h-0">
                    {workloadContributors.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <DonutWorkloadChart rows={workloadContributors} />}
                  </div>
                </div>

                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 lg:col-span-3 lg:h-[430px] flex flex-col">
                  <button onClick={() => setExpandedVisualizationId('contribution')} className="absolute right-4 top-4 z-10 h-7 w-7 rounded-md border border-slate-200 text-slate-400"><Maximize2 className="w-3.5 h-3.5 mx-auto" /></button>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Top User Work Mix</h2>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {contributionRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <UserContributionStackChart rows={contributionRows} maxVisibleRows={3} />}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pb-10">
                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:min-h-[420px] flex flex-col">
                  <button onClick={() => setExpandedVisualizationId('flow')} className="absolute right-4 top-4 z-10 h-7 w-7 rounded-md border border-slate-200 text-slate-400"><Maximize2 className="w-3.5 h-3.5 mx-auto" /></button>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Step Delay Analysis</h2>
                  <div className="flex-1 min-h-0">
                    {flowRows.length === 0 ? <EmptyState icon={RefreshCw} title="No Data" /> : (
                      <DurationBarChart
                        rows={flowRows.map((row) => ({
                          id: row.transitionKey,
                          label: row.transitionLabel,
                          value: row.avgSeconds,
                          minValue: row.minSeconds,
                          maxValue: row.maxSeconds,
                          valueLabel: `${formatDuration(row.avgSeconds)} avg`,
                          meta: `Min ${formatDuration(row.minSeconds)} | Max ${formatDuration(row.maxSeconds)}`,
                        }))}
                        maxVisibleRows={4}
                      />
                    )}
                  </div>
                </div>

                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 lg:min-h-[420px] flex flex-col">
                  <button onClick={() => setExpandedVisualizationId('matrix')} className="absolute right-4 top-4 z-10 h-7 w-7 rounded-md border border-slate-200 text-slate-400"><Maximize2 className="w-3.5 h-3.5 mx-auto" /></button>
                  <h2 className="text-lg font-bold text-slate-900 mb-4">Quality vs Edit by User</h2>
                  <div className="flex-1 min-h-0">
                    {matrixRows.length === 0 ? <EmptyState icon={Search} title="No Data" /> : <ReworkMatrixScatterChart rows={matrixRows} />}
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedVisualizationId ? (
            <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 md:p-6 bg-slate-900/35 backdrop-blur-[1px]" onClick={() => setExpandedVisualizationId('')}>
              <div className="w-full max-w-[1800px] h-[94vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="text-lg font-bold text-slate-900">{visualizationMeta[expandedVisualizationId]?.title || 'Visualization'}</div>
                  <button onClick={() => setExpandedVisualizationId('')} className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500"><X className="w-4 h-4 mx-auto" /></button>
                </div>
                <div className="p-5 md:p-6 overflow-auto flex-1">
                  {renderExpandedVisualization()}
                </div>
              </div>
            </div>
          ) : null}

          {showExportConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowExportConfirm(false)}>
              <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden p-6 text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><FileSpreadsheet className="w-8 h-8 text-emerald-600" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Export to Excel</h3>
                <p className="text-sm text-slate-500 mb-6">Export {ganttVisibleSegments.length.toLocaleString()} segments?</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowExportConfirm(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm">Cancel</button>
                  <button onClick={() => { setShowExportConfirm(false); exportTimelineExcel(); }} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm">Export Now</button>
                </div>
              </div>
            </div>
          )}

          {selectedGanttSegment && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm" onClick={() => setSelectedGanttSegment(null)}>
              <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-lg font-bold text-slate-900">Segment Details</div>
                  <button onClick={() => setSelectedGanttSegment(null)} className="text-slate-400"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-slate-50 p-2 rounded">Type: {toGanttSegmentTypeLabel(selectedGanttSegment.segmentType)}</div>
                  <div className="bg-slate-50 p-2 rounded">Duration: {formatDuration(selectedGanttSegment.durationSeconds)}</div>
                  <div className="bg-slate-50 p-2 rounded col-span-2">Start: {toDisplayDate(selectedGanttSegment.start)}</div>
                  <div className="bg-slate-50 p-2 rounded col-span-2">End: {toDisplayDate(selectedGanttSegment.end)}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
