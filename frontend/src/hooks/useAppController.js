import { useMemo, useState } from 'react';
import { usePersistentState } from './usePersistentState.js';
import { requestJson } from '../lib/api.js';
import {
  downloadExcelTable,
  formatDuration,
  toExcelDateTime,
  toGanttSegmentTypeLabel,
  toTimelineLane,
} from '../lib/utils.js';

export function useAppController(dashboard) {
  const {
    ganttVisibleSegments,
    workloadContributors,
    showWorkloadSystem,
    refreshAll,
    setErrorMessage,
  } = dashboard;

  const [activeView, setActiveView] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState('');
  const [expandedVisualizationId, setExpandedVisualizationId] = useState('');
  const [selectedGanttSegment, setSelectedGanttSegment] = useState(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentState('sidebar_collapsed', false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [segmentTypeSearchText, setSegmentTypeSearchText] = useState('');
  const [documentFileSearch, setDocumentFileSearch] = useState('');
  const [documentSheetSearch, setDocumentSheetSearch] = useState('');
  const [showMatrixQuadrants, setShowMatrixQuadrants] = usePersistentState('filter_showMatrixQuadrants', false);
  const [showProcessBreakdownIdle, setShowProcessBreakdownIdle] = usePersistentState('filter_showProcessBreakdownIdle', true);
  const [showProcessBreakdownLabels, setShowProcessBreakdownLabels] = usePersistentState('filter_showProcessBreakdownLabels', true);

  const workloadVisibleRows = useMemo(() => {
    const filtered = workloadContributors.filter((row) => showWorkloadSystem || row.user !== 'System');
    const total = filtered.reduce((sum, row) => sum + row.totalSeconds, 0);
    return filtered.map((row) => ({ ...row, share: total > 0 ? row.totalSeconds / total : 0 }));
  }, [workloadContributors, showWorkloadSystem]);

  const handleUploadFiles = async (files) => {
    setUploading(true);
    try {
      const payloadFiles = await Promise.all(files.map(async (file) => {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.readAsDataURL(file);
        });
        return { name: file.name, contentBase64: base64 };
      }));
      await requestJson('/api/upload', { method: 'POST', body: JSON.stringify({ files: payloadFiles }) });
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      await requestJson(`/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleConnectGSheet = async (url) => {
    try {
      await requestJson('/api/gsheet/connect', { method: 'POST', body: JSON.stringify({ url }) });
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleDisconnectGSheet = async (id) => {
    try {
      await requestJson(`/api/gsheet/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refreshAll();
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const exportTimelineExcel = () => {
    if (ganttVisibleSegments.length === 0) return;

    const columns = [
      { key: 'no', label: 'No.' },
      { key: 'lane', label: 'Lane' },
      { key: 'userName', label: 'User' },
      { key: 'segmentLabel', label: 'Segment' },
      { key: 'start', label: 'Start' },
      { key: 'end', label: 'End' },
      { key: 'duration', label: 'Duration' },
    ];
    const rows = ganttVisibleSegments.map((segment, idx) => ({
      no: idx + 1,
      lane: toTimelineLane(segment.segmentType, segment.userName),
      userName: segment.userName,
      segmentLabel: toGanttSegmentTypeLabel(segment.segmentType),
      start: toExcelDateTime(segment.start),
      end: toExcelDateTime(segment.end),
      duration: formatDuration(segment.durationSeconds),
    }));
    downloadExcelTable('timeline-export.xls', 'Timeline', columns, rows);
  };

  const confirmExportTimeline = () => {
    setShowExportConfirm(false);
    exportTimelineExcel();
  };

  return {
    activeView,
    setActiveView,
    openDropdown,
    setOpenDropdown,
    expandedVisualizationId,
    setExpandedVisualizationId,
    selectedGanttSegment,
    setSelectedGanttSegment,
    showExportConfirm,
    setShowExportConfirm,
    uploading,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    userSearchText,
    setUserSearchText,
    segmentTypeSearchText,
    setSegmentTypeSearchText,
    documentFileSearch,
    setDocumentFileSearch,
    documentSheetSearch,
    setDocumentSheetSearch,
    showMatrixQuadrants,
    setShowMatrixQuadrants,
    showProcessBreakdownIdle,
    setShowProcessBreakdownIdle,
    showProcessBreakdownLabels,
    setShowProcessBreakdownLabels,
    workloadVisibleRows,
    handleUploadFiles,
    handleDeleteSource,
    handleConnectGSheet,
    handleDisconnectGSheet,
    confirmExportTimeline,
  };
}
