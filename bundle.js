// AUTO-GENERATED FAIL-SAFE BUNDLE
import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';
import { 
  Users, Server, Clock, Timer, RefreshCw, AlertTriangle, Star, Search, 
  Calendar, LayoutDashboard, Menu, X, ChevronLeft, ChevronRight, Database, 
  UploadCloud, Link2, FileText, FileSpreadsheet, Trash2, CheckCircle2, 
  Plus, Maximize2, SlidersHorizontal, Eye, EyeOff, ChevronDown, User, Pin
} from 'lucide-react';


// --- lib/constants.js ---


const API_BASE = '';
const FRONTEND_BUILD_VERSION = '2026-05-25-system-professional-18';
// ... rest of exports ...
const initialKpiData = [
  { id: 1, label: 'Active User Time', value: '-', subtext: 'Avg per user: -', icon: Clock, color: 'text-[#00a4e4]', bg: 'bg-[#e8f7fd]' },
  { id: 2, label: 'Contributing Users', value: '0', subtext: 'No user data', icon: Users, color: 'text-[#3860be]', bg: 'bg-[#eef3ff]' },
  { id: 3, label: 'Avg User Action', value: '-', subtext: 'Med - · - - -', icon: Timer, color: 'text-[#00a4e4]', bg: 'bg-[#e8f7fd]' },
  { id: 5, label: 'Edit Rate', value: '0.0%', subtext: '0 edit / 0 actions', icon: RefreshCw, color: 'text-[#3860be]', bg: 'bg-[#eef3ff]' },
  { id: 6, label: 'Active System Time', value: '-', subtext: '0.0% of active time', icon: Clock, color: 'text-[#334155]', bg: 'bg-slate-100' },
];
const REOPEN_MARKER_TYPES = new Set(['REOPEN_MARKER', 'REOPEN_TO_REVIEW_HANDOFF_MARKER']);
const PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES = new Set(['IDLE_WAITING_FOR_SCHEDULED_REPROCESS']);
const COMPLETE_MARKER_COLOR = '#16A34A';
const REPROCESSING_SEGMENT_MERGE_GAP_MS = 1000;
const MARKER_STAR_OUTER_RADIUS = 5.2;
const MARKER_STAR_INNER_RADIUS = 2.3;
const MARKER_STAR_MIN_GAP_PX = 12;
const oldvisualizcolor = {
  chartPalette: ['#2563EB', '#0EA5E9', '#14B8A6', '#22C55E', '#EAB308', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'],
  segmentColors: {
    USER_REVIEW_COMMENT_CHECK: '#06B6D4',
    USER_EDITING_CORRECTION: '#F59E0B',
    USER_COMPLETION_APPROVAL: '#10B981',
    USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: '#059669',
    USER_UPLOADING: '#8B5CF6',
    USER_REVIEW_AUTO_TIMEOUT: '#EF4444',
    SYSTEM_INITIAL_PROCESSING: '#334155',
    SYSTEM_SCHEDULED_REPROCESSING: '#334155',
    SYSTEM_INTERNAL_TRANSITION: '#334155',
    IDLE_WAITING_FOR_REVIEW: '#94A3B8',
    IDLE_WAITING_FOR_REREVIEW: '#94A3B8',
    IDLE_WAITING_FOR_SCHEDULED_REPROCESS: '#334155',
    IDLE_AFTER_SYSTEM_REPROCESS: '#94A3B8',
    AUTO_TIMEOUT_MARKER: '#DC2626',
    SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: '#475569',
    REOPEN_MARKER: '#A855F7',
  },
  ganttDrillGroupColors: {
    Uploading: '#8B5CF6',
    Processing: '#334155',
    Review: '#06B6D4',
    ReviewAutoClose: '#06B6D4',
    Reprocessing: '#334155',
    Edit: '#F59E0B',
    EditAndComplete: '#10B981',
    Idle: '#94A3B8',
  },
  chartAccent: '#2563EB',
  chartSecondary: '#0EA5E9',
  chartPositive: '#10B981',
  matrixPalette: ['#F43F5E', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#D946EF', '#84CC16', '#F97316'],
};
const CHART_PALETTE = oldvisualizcolor.chartPalette;
const SEGMENT_COLORS = {
  USER_REVIEW_COMMENT_CHECK: oldvisualizcolor.segmentColors.USER_REVIEW_COMMENT_CHECK,
  USER_EDITING_CORRECTION: oldvisualizcolor.segmentColors.USER_EDITING_CORRECTION,
  USER_COMPLETION_APPROVAL: oldvisualizcolor.segmentColors.USER_COMPLETION_APPROVAL,
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: oldvisualizcolor.segmentColors.USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL,
  USER_UPLOADING: oldvisualizcolor.segmentColors.USER_UPLOADING,
  USER_REVIEW_AUTO_TIMEOUT: oldvisualizcolor.segmentColors.USER_REVIEW_AUTO_TIMEOUT,
  SYSTEM_INITIAL_PROCESSING: '#334155',
  SYSTEM_SCHEDULED_REPROCESSING: '#334155',
  SYSTEM_INTERNAL_TRANSITION: '#334155',
  IDLE_WAITING_FOR_REVIEW: '#94A3B8',
  IDLE_WAITING_FOR_REREVIEW: '#94A3B8',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: '#334155',
  IDLE_AFTER_SYSTEM_REPROCESS: '#94A3B8',
  AUTO_TIMEOUT_MARKER: '#DC2626',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: '#475569',
  REOPEN_MARKER: '#A855F7',
};
const SEGMENT_TYPE_SHORT_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed',
  USER_EDITING_CORRECTION: 'Edit',
  USER_COMPLETION_APPROVAL: 'Review & Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit & Complete',
  USER_UPLOADING: 'Upload',
  SYSTEM_INITIAL_PROCESSING: 'Processing',
  SYSTEM_SCHEDULED_REPROCESSING: 'Reprocessing',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Reprocessing',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  COMPLETE_BY_REVIEW_MARKER: 'Review Complete Marker',
  COMPLETE_BY_EDIT_MARKER: 'Edit Complete Marker',
  COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER: 'System Complete Marker',
  REOPEN_TO_REVIEW_HANDOFF_MARKER: 'Reopen Handoff Marker',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'System Reprocess',
  REOPEN_MARKER: 'Reopen',
};
const GANTT_SEGMENT_DISPLAY_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_EDITING_CORRECTION: 'Edit',
  USER_COMPLETION_APPROVAL: 'Review & Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit & Complete',
  USER_UPLOADING: 'Upload',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed (Timeout)',
  SYSTEM_INITIAL_PROCESSING: 'Processing',
  SYSTEM_SCHEDULED_REPROCESSING: 'Reprocessing',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  COMPLETE_BY_REVIEW_MARKER: 'Review Complete Marker',
  COMPLETE_BY_EDIT_MARKER: 'Edit Complete Marker',
  COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER: 'System Complete Marker',
  REOPEN_TO_REVIEW_HANDOFF_MARKER: 'Reopen Handoff Marker',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Reprocessing',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'System Reprocess Round 2',
  REOPEN_MARKER: 'Reopen Marker',
};

const GANTT_DRILL_GROUPS = [
  { key: 'Uploading', label: 'Uploading', color: oldvisualizcolor.ganttDrillGroupColors.Uploading },
  { key: 'Processing', label: 'Processing', color: oldvisualizcolor.ganttDrillGroupColors.Processing },
  { key: 'Idle', label: 'Idle', color: oldvisualizcolor.ganttDrillGroupColors.Idle },
  { key: 'Review', label: 'Review', color: oldvisualizcolor.ganttDrillGroupColors.Review },
  { key: 'ReviewAutoClose', label: 'Review Auto Close', color: oldvisualizcolor.ganttDrillGroupColors.ReviewAutoClose },
  { key: 'Edit', label: 'Edit', color: oldvisualizcolor.ganttDrillGroupColors.Edit },
  { key: 'EditAndComplete', label: 'Complete', color: oldvisualizcolor.ganttDrillGroupColors.EditAndComplete },
];

const GANTT_MIN_ZOOM_SCALE = 0.35;
const GANTT_MAX_ZOOM_SCALE = 8000;
const GANTT_MAX_TIMELINE_WIDTH_PX = 120000000;

const GANTT_DRILL_GROUP_COLORS = {
  Uploading: oldvisualizcolor.ganttDrillGroupColors.Uploading,
  Processing: oldvisualizcolor.ganttDrillGroupColors.Processing,
  Review: oldvisualizcolor.ganttDrillGroupColors.Review,
  ReviewAutoClose: oldvisualizcolor.ganttDrillGroupColors.ReviewAutoClose,
  Reprocessing: oldvisualizcolor.ganttDrillGroupColors.Reprocessing,
  Edit: oldvisualizcolor.ganttDrillGroupColors.Edit,
  EditAndComplete: oldvisualizcolor.ganttDrillGroupColors.EditAndComplete,
  Idle: oldvisualizcolor.ganttDrillGroupColors.Idle,
};

const GANTT_DRILL_GROUP_LABELS = {
  Uploading: 'Uploading',
  Processing: 'Processing',
  Review: 'Review',
  ReviewAutoClose: 'Review Auto Close',
  Reprocessing: 'Reprocessing',
  Edit: 'Edit',
  EditAndComplete: 'Complete',
  Idle: 'Idle',
};

const CORE_WORK_SESSION_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_COMPLETION_APPROVAL',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
]);
const WORKFLOW_FLOW_SEGMENT_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_COMPLETION_APPROVAL',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
  'USER_UPLOADING',
  'SYSTEM_INITIAL_PROCESSING',
  'SYSTEM_SCHEDULED_REPROCESSING',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2',
  'SYSTEM_INTERNAL_TRANSITION',
  'IDLE_WAITING_FOR_REVIEW',
  'IDLE_WAITING_FOR_REREVIEW',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS',
  'IDLE_AFTER_SYSTEM_REPROCESS',
  'POST_COMPLETED_ELAPSED',
]);

const FLOW_INSIGHT_GROUPS = [
  {
    id: 'processing-round-1-to-user',
    label: 'Round 1 Processing -> User Action',
    description: '',
  },
  {
    id: 'processing-round-2-to-user',
    label: 'Round 2 Processing -> User Action',
    description: '',
  },
  {
    id: 'user-review-edit-to-next-user-step',
    label: 'User Action -> Next User Step',
    description: '',
  },
  {
    id: 'upload-to-latest-complete',
    label: 'Upload -> Final Complete',
    description: '',
  },
];

const TRANSITION_FRIENDLY_LABELS = {
  'USER_UPLOADING=>SYSTEM_INITIAL_PROCESSING': 'Upload complete -> System starts processing',
  'USER_UPLOADING=>IDLE_WAITING_FOR_REVIEW': 'Upload complete -> Waiting for review',
  'USER_UPLOADING=>USER_REVIEW_COMMENT_CHECK': 'Upload complete -> Review starts immediately',
  'USER_UPLOADING=>USER_REVIEW_AUTO_TIMEOUT': 'Upload complete -> No reviewer (timeout)',
  'SYSTEM_INITIAL_PROCESSING=>IDLE_WAITING_FOR_REVIEW': 'Processing complete -> Waiting for review',
  'SYSTEM_INITIAL_PROCESSING=>USER_REVIEW_COMMENT_CHECK': 'Processing complete -> Review starts immediately',
  'SYSTEM_INITIAL_PROCESSING=>USER_EDITING_CORRECTION': 'Processing complete -> Edit starts immediately',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_COMMENT_CHECK': 'Waiting for review -> Review starts',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_AUTO_TIMEOUT': 'Waiting too long for review -> Timeout',
  'IDLE_WAITING_FOR_REREVIEW=>USER_REVIEW_COMMENT_CHECK': 'Waiting for re-review -> Review starts',
  'IDLE_WAITING_FOR_REREVIEW=>USER_EDITING_CORRECTION': 'Waiting for re-review -> Edit starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_REVIEW_COMMENT_CHECK': 'Reprocess complete -> Review starts',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_EDITING_CORRECTION': 'Reprocess complete -> Edit starts',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS=>SYSTEM_SCHEDULED_REPROCESSING': 'Queued -> System reprocessing',
  'USER_REVIEW_COMMENT_CHECK=>USER_COMPLETION_APPROVAL': 'Review passed -> Complete approval',
  'USER_REVIEW_COMMENT_CHECK=>USER_EDITING_CORRECTION': 'Review failed -> Send to edit',
  'USER_REVIEW_COMMENT_CHECK=>IDLE_WAITING_FOR_REREVIEW': 'Review done -> Waiting re-review',
  'USER_REVIEW_COMMENT_CHECK=>SYSTEM_SCHEDULED_REPROCESSING': 'Review done -> Send to system reprocess',
  'USER_EDITING_CORRECTION=>USER_COMPLETION_APPROVAL': 'Edit done -> Complete approval',
  'USER_EDITING_CORRECTION=>IDLE_WAITING_FOR_REREVIEW': 'Edit done -> Waiting re-review',
  'USER_EDITING_CORRECTION=>SYSTEM_SCHEDULED_REPROCESSING': 'Edit done -> Send to system reprocess',
  'USER_EDITING_CORRECTION=>USER_REVIEW_COMMENT_CHECK': 'Edit done -> Back to review',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_EDITING_CORRECTION': 'Review timeout -> Back to edit',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_REVIEW_COMMENT_CHECK': 'Review timeout -> Back to review',
  'USER_REVIEW_AUTO_TIMEOUT=>IDLE_WAITING_FOR_REREVIEW': 'Review timeout -> Waiting re-review',
  'USER_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Approval complete -> Waiting re-review',
  'USER_COMPLETION_APPROVAL=>SYSTEM_SCHEDULED_REPROCESSING': 'Approval complete -> Send to system reprocess',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'Edit + approval -> Waiting re-review',
  'SYSTEM_SCHEDULED_REPROCESSING=>IDLE_AFTER_SYSTEM_REPROCESS': 'System reprocess complete -> Waiting reviewer',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_REVIEW_COMMENT_CHECK': 'System reprocess complete -> Review starts',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_EDITING_CORRECTION': 'System reprocess complete -> Edit starts',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>IDLE_AFTER_SYSTEM_REPROCESS': 'Round 2 reprocess complete -> Waiting reviewer',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>USER_REVIEW_COMMENT_CHECK': 'Round 2 reprocess complete -> Review starts',
};


// --- lib/numberUtils.js ---
function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function percentile(values, ratio) {
  const prepared = (Array.isArray(values) ? values : [])
    .map((value) => safeNumber(value))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  if (prepared.length === 0) return 0;
  const boundedRatio = Math.max(0, Math.min(1, safeNumber(ratio)));
  const index = Math.ceil(boundedRatio * prepared.length) - 1;
  return prepared[Math.max(0, Math.min(prepared.length - 1, index))];
}


// --- lib/durationFormatters.js ---
function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (safe === 0) return '0s';

  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 30 * DAY;
  const YEAR = 365 * DAY;

  const parts = [];
  let remaining = safe;

  if (remaining >= YEAR) {
    const years = Math.floor(remaining / YEAR);
    parts.push(`${years}y`);
    remaining %= YEAR;
  }
  if (remaining >= MONTH) {
    const months = Math.floor(remaining / MONTH);
    parts.push(`${months}mo`);
    remaining %= MONTH;
  }
  if (remaining >= DAY) {
    const days = Math.floor(remaining / DAY);
    parts.push(`${days}d`);
    remaining %= DAY;
  }
  if (remaining >= HOUR) {
    const hours = Math.floor(remaining / HOUR);
    parts.push(`${hours}h`);
    remaining %= HOUR;
  }
  if (remaining >= MINUTE) {
    const minutes = Math.floor(remaining / MINUTE);
    parts.push(`${minutes}m`);
    remaining %= MINUTE;
  }
  if (remaining > 0 || parts.length === 0) {
    parts.push(`${remaining}s`);
  }

  // Return up to 3 units for a good balance of detail and readability
  return parts.slice(0, 3).join(' ');
}

function formatPercent(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}


// --- lib/dateFormatters.js ---
function toDisplayDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function toExcelDateTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

function formatTimeTick(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTickHeader(value) {
  if (!value) return { dateLabel: '-', timeLabel: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { dateLabel: String(value), timeLabel: '' };
  return {
    dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    timeLabel: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function isSameCalendarDay(aTs, bTs) {
  const a = new Date(aTs);
  const b = new Date(bTs);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}


// --- lib/excelExport.js ---
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function downloadExcelTable(filename, sheetTitle, columns, rows) {
  const headerHtml = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const rowsHtml = rows.map((row) => (
    `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`
  )).join('');
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #e2e8f0; font-weight: 700; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; white-space: nowrap; }
  </style>
</head>
<body>
  <h3>${escapeHtml(sheetTitle)}</h3>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</body>
</html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


// --- lib/segmentUtils.js ---


function toSegmentTypeLabel(segmentType) {
  const key = String(segmentType || '');
  if (SEGMENT_TYPE_SHORT_LABELS[key]) return SEGMENT_TYPE_SHORT_LABELS[key];
  return key
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toGanttSegmentTypeLabel(segmentType) {
  const key = String(segmentType || '');
  if (GANTT_SEGMENT_DISPLAY_LABELS[key]) return GANTT_SEGMENT_DISPLAY_LABELS[key];
  return toSegmentTypeLabel(key);
}

function isProcessingEquivalentIdleSegment(segmentType) {
  const type = String(segmentType || '');
  return PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES.has(type);
}

function isReprocessingSegmentType(segmentType) {
  const type = String(segmentType || '');
  return type === 'SYSTEM_SCHEDULED_REPROCESSING'
    || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
    || isProcessingEquivalentIdleSegment(type);
}

function toDisplaySegmentTypeCode(segmentType) {
  const type = String(segmentType || '');
  if (type === 'COMPLETE_BY_REVIEW_MARKER') return 'USER_COMPLETION_APPROVAL';
  if (type === 'COMPLETE_BY_EDIT_MARKER') return 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
  if (type === 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER') return 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2';
  if (isReprocessingSegmentType(type)) return 'SYSTEM_SCHEDULED_REPROCESSING';
  return type;
}

function toCompleteMarkerType(segmentOrType) {
  const segment = segmentOrType && typeof segmentOrType === 'object' ? segmentOrType : null;
  const type = String(segment ? segment.segmentType : segmentOrType || '');
  if (type === 'USER_COMPLETION_APPROVAL') return 'COMPLETE_BY_REVIEW_MARKER';
  if (type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL') return 'COMPLETE_BY_EDIT_MARKER';
  if (segment && segment.hasReprocessRound2CompleteMarker) return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  if (type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2') return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  if (type === 'SYSTEM_SCHEDULED_REPROCESSING') return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  return '';
}

function mergeContinuousReprocessingSegments(sortedSegments) {
  if (!Array.isArray(sortedSegments) || sortedSegments.length <= 1) return sortedSegments;

  const merged = [];
  sortedSegments.forEach((segment) => {
    const segmentCopy = {
      ...segment,
      reopenMarkerList: Array.isArray(segment.reopenMarkerList) ? [...segment.reopenMarkerList] : [],
      hasReprocessRound2CompleteMarker: Boolean(segment.hasReprocessRound2CompleteMarker)
        || String(segment.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
        || String(segment.segmentType || '') === 'SYSTEM_SCHEDULED_REPROCESSING',
    };

    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(segmentCopy);
      return;
    }

    const sameContext = String(previous.contextKey || '') === String(segmentCopy.contextKey || '');
    const shouldMerge = sameContext
      && isReprocessingSegmentType(previous.segmentType)
      && isReprocessingSegmentType(segmentCopy.segmentType)
      && segmentCopy.startTs <= previous.endTs + REPROCESSING_SEGMENT_MERGE_GAP_MS;

    if (!shouldMerge) {
      merged.push(segmentCopy);
      return;
    }

    previous.endTs = Math.max(previous.endTs, segmentCopy.endTs);
    if (segmentCopy.endTs >= previous.endTs) previous.end = segmentCopy.end;
    previous.durationSeconds = Math.max(0, Math.round((previous.endTs - previous.startTs) / 1000));
    previous.segmentType = 'SYSTEM_SCHEDULED_REPROCESSING';
    previous.drillGroup = 'Reprocessing';
    previous.hasReprocessRound2CompleteMarker = Boolean(previous.hasReprocessRound2CompleteMarker)
      || Boolean(segmentCopy.hasReprocessRound2CompleteMarker);
    previous.reopenMarkerList = [
      ...(Array.isArray(previous.reopenMarkerList) ? previous.reopenMarkerList : []),
      ...(Array.isArray(segmentCopy.reopenMarkerList) ? segmentCopy.reopenMarkerList : []),
    ];
  });

  return merged;
}

function toDrillGroup(segmentType) {
  const type = String(segmentType || '');
  if (type === 'USER_UPLOADING') return 'Uploading';
  if (type === 'COMPLETE_BY_REVIEW_MARKER') return 'Review';
  if (type === 'COMPLETE_BY_EDIT_MARKER') return 'Edit';
  if (type === 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER') return 'Reprocessing';
  if (isProcessingEquivalentIdleSegment(type)) return 'Reprocessing';
  if (type === 'SYSTEM_INITIAL_PROCESSING' || type === 'SYSTEM_INTERNAL_TRANSITION') return 'Processing';
  if (type === 'USER_REVIEW_COMMENT_CHECK') return 'Review';
  if (isIdleContextSegment(type)) return 'Idle';
  if (type === 'USER_REVIEW_AUTO_TIMEOUT' || type === 'AUTO_TIMEOUT_MARKER') return 'ReviewAutoClose';
  if (
    type === 'SYSTEM_SCHEDULED_REPROCESSING'
    || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
  ) return 'Reprocessing';
  if (type === 'USER_EDITING_CORRECTION') return 'Edit';
  if (type === 'USER_COMPLETION_APPROVAL') return 'Review';
  if (type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL') return 'Edit';
  return 'Processing';
}

function toTimelineLane(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (isProcessingEquivalentIdleSegment(type)) return 'System';
  if (type.startsWith('SYSTEM_')) return 'System';
  if (isIdleContextSegment(type)) return 'Idle';
  const userName = String(userNameRaw || '').trim();
  if (userName.toLowerCase() === 'system') return 'System';
  return userName || 'Unknown User';
}

function isIdleContextSegment(segmentType) {
  const type = String(segmentType || '');
  return (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE' || type === 'POST_COMPLETED_ELAPSED' || type === 'UNKNOWN_OR_LOW_CONFIDENCE')
    && !isProcessingEquivalentIdleSegment(type);
}

function isUserContextSegment(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (type.startsWith('USER_')) return true;
  if (type === 'AUTO_TIMEOUT_MARKER') {
    const userName = String(userNameRaw || '').trim().toLowerCase();
    return userName.length > 0 && userName !== 'system';
  }
  return false;
}

function buildAsteriskPoints(cx, cy, outerRadius = 6, innerRadius = 2.6, spikes = 5) {
  const points = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * step;
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return points.join(' ');
}

function spreadMarkerPositions(markerItems, minGapPx = MARKER_STAR_MIN_GAP_PX) {
  if (!Array.isArray(markerItems) || markerItems.length === 0) return [];
  if (markerItems.length === 1) {
    return markerItems.map((item) => ({ ...item, x: item.rawX }));
  }
  const sorted = markerItems
    .map((item, idx) => ({ ...item, orderIdx: idx }))
    .sort((a, b) => (a.rawX - b.rawX) || (a.orderIdx - b.orderIdx));

  let startIdx = 0;
  while (startIdx < sorted.length) {
    let endIdx = startIdx + 1;
    while (endIdx < sorted.length && (sorted[endIdx].rawX - sorted[endIdx - 1].rawX) < minGapPx) {
      endIdx += 1;
    }

    const cluster = sorted.slice(startIdx, endIdx);
    if (cluster.length === 1) {
      cluster[0].x = cluster[0].rawX;
    } else {
      const centerX = cluster.reduce((sum, item) => sum + item.rawX, 0) / cluster.length;
      const firstX = centerX - ((cluster.length - 1) * minGapPx) / 2;
      cluster.forEach((item, idx) => {
        item.x = firstX + (idx * minGapPx);
      });
    }

    startIdx = endIdx;
  }

  return sorted
    .sort((a, b) => a.orderIdx - b.orderIdx)
    .map(({ orderIdx, ...item }) => item);
}

function buildSheetKey(fileName, pageName) {
  const safeFile = String(fileName || 'Unknown File');
  const safePage = String(pageName || '__NO_PAGE__');
  return `${safeFile}::${safePage}`;
}

function extractFileNameFromSheetKey(sheetKey) {
  const normalized = String(sheetKey || '');
  const delimiterIndex = normalized.indexOf('::');
  if (delimiterIndex < 0) return normalized;
  return normalized.slice(0, delimiterIndex);
}


// --- lib/kpiUtils.js ---






function buildKpiData(kpis) {
  if (!kpis) return initialKpiData;
  return [
    {
      id: 1,
      label: 'Active User Time',
      value: kpis.activeUserTimeDisplay || '-',
      subtext: `Avg per user: ${kpis.avgTimePerUserDisplay || '-'}`,
      icon: Clock,
      color: 'text-[#00a4e4]',
      bg: 'bg-[#e8f7fd]',
    },
    {
      id: 2,
      label: 'Contributing Users',
      value: String(kpis.contributingUsers || 0),
      subtext: kpis.topContributorName
        ? `Top: ${kpis.topContributorName} (${kpis.topContributorDisplay})`
        : 'No user data',
      icon: Users,
      color: 'text-[#3860be]',
      bg: 'bg-[#eef3ff]',
    },
    {
      id: 3,
      label: 'Avg User Action',
      value: kpis.avgUserSessionDisplay || '-',
      subtext: `Med ${kpis.medianSessionDisplay || '-'} · ${kpis.minSessionDisplay || '-'} - ${kpis.maxSessionDisplay || '-'}`,
      icon: Timer,
      color: 'text-[#00a4e4]',
      bg: 'bg-[#e8f7fd]',
    },
    {
      id: 5,
      label: 'Edit Rate',
      value: kpis.reworkRateDisplay || '0.0%',
      subtext: `${formatDuration(kpis.editTimeSeconds || 0)} edit / ${kpis.activeUserTimeDisplay || '0s'} active`,
      icon: RefreshCw,
      color: 'text-[#3860be]',
      bg: 'bg-[#eef3ff]',
    },
    {
      id: 6,
      label: 'Active System Time',
      value: kpis.systemTimeDisplay || '-',
      subtext: `${formatPercent(kpis.systemPercentOfActive || 0)} of active time`,
      icon: Clock,
      color: 'text-[#334155]',
      bg: 'bg-slate-100',
    },
  ];
}

function buildKpisFromSegments(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const userSegments = safeSegments.filter((segment) => String(segment.segmentType || '').startsWith('USER_'));
  const coreUserSegments = userSegments.filter((segment) => CORE_WORK_SESSION_TYPES.has(String(segment.segmentType || '')));
  const idleSegments = safeSegments.filter((segment) => isIdleContextSegment(segment.segmentType));
  const processingEquivalentIdleSegments = safeSegments.filter((segment) => isProcessingEquivalentIdleSegment(segment.segmentType));
  const systemSegments = safeSegments.filter((s) => String(s.segmentType || '').startsWith('SYSTEM_'));

  const effectiveDuration = (segment) => safeNumber(segment?.durationSeconds);

  const activeUserTimeSeconds = userSegments.reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const coreActiveUserTimeSeconds = coreUserSegments.reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const contributingUsers = new Set(
    userSegments
      .map((segment) => String(segment.userName || ''))
      .filter((userName) => userName && userName.toLowerCase() !== 'system')
  ).size;
  const avgUserSessionSeconds = coreUserSegments.length > 0 ? coreActiveUserTimeSeconds / coreUserSegments.length : 0;

  const uniqueDocuments = new Set(
    safeSegments
      .map((s) => s.documentId || s.fileName)
      .filter(Boolean)
  ).size;

  const idleWaitingSeconds = idleSegments.reduce((sum, segment) => sum + safeNumber(segment.durationSeconds), 0);
  const idleWaitingOccurrences = idleSegments.length;
  
  const processingEquivalentSystemSeconds = processingEquivalentIdleSegments.reduce((sum, segment) => sum + safeNumber(segment.durationSeconds), 0);
  const coreSystemSeconds = systemSegments.reduce((sum, s) => sum + safeNumber(s.durationSeconds), 0);
  const systemTimeSeconds = coreSystemSeconds + processingEquivalentSystemSeconds;

  const avgSystemTimePerDoc = uniqueDocuments > 0 ? systemTimeSeconds / uniqueDocuments : 0;

  const totalActiveSeconds = activeUserTimeSeconds + systemTimeSeconds;
  const systemPercentOfActive = totalActiveSeconds > 0 ? (systemTimeSeconds / totalActiveSeconds) : 0;

  const editTimeSeconds = coreUserSegments
    .filter((segment) => {
      const type = String(segment.segmentType || '');
      return type === 'USER_EDITING_CORRECTION' || type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
    })
    .reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const reworkRate = activeUserTimeSeconds > 0 ? (editTimeSeconds / activeUserTimeSeconds) : 0;

  const totalCycleSeconds = activeUserTimeSeconds + idleWaitingSeconds + systemTimeSeconds;
  const idlePercentOfCycle = totalCycleSeconds > 0 ? (idleWaitingSeconds / totalCycleSeconds) * 100 : 0;
  const systemPercentOfCycle = totalCycleSeconds > 0 ? (systemTimeSeconds / totalCycleSeconds) * 100 : 0;
  const avgTimePerUser = contributingUsers > 0 ? activeUserTimeSeconds / contributingUsers : 0;

  const userTimeMap = {};
  for (const seg of userSegments) {
    const name = String(seg.userName || '').trim();
    if (name && name.toLowerCase() !== 'system') {
      userTimeMap[name] = (userTimeMap[name] || 0) + effectiveDuration(seg);
    }
  }
  const topContributor = Object.entries(userTimeMap).sort((a, b) => b[1] - a[1])[0];

  const sessionDurations = coreUserSegments.map((s) => effectiveDuration(s)).sort((a, b) => a - b);
  const medianSessionSeconds = sessionDurations.length > 0
    ? sessionDurations[Math.floor(sessionDurations.length / 2)]
    : 0;
  const minSessionSeconds = sessionDurations.length > 0 ? sessionDurations[0] : 0;
  const maxSessionSeconds = sessionDurations.length > 0 ? sessionDurations[sessionDurations.length - 1] : 0;

  const totalSessions = coreUserSegments.length;

  const reworkSessions = coreUserSegments.filter((segment) => {
    const type = String(segment.segmentType || '');
    return type === 'USER_EDITING_CORRECTION' || type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
  }).length;

  return {
    activeUserTimeSeconds,
    activeUserTimeDisplay: formatDuration(activeUserTimeSeconds),
    contributingUsers,
    uniqueDocuments,
    avgUserSessionSeconds,
    avgUserSessionDisplay: formatDuration(avgUserSessionSeconds),
    idleWaitingSeconds,
    idleWaitingDisplay: formatDuration(idleWaitingSeconds),
    idleWaitingOccurrences,
    reworkRate,
    reworkRateDisplay: formatPercent(reworkRate),
    systemTimeSeconds,
    systemTimeDisplay: formatDuration(systemTimeSeconds),
    avgSystemTimePerDoc,
    avgSystemTimePerDocDisplay: formatDuration(avgSystemTimePerDoc),
    systemPercentOfActive,
    systemPercentOfCycle,
    avgTimePerUser,
    avgTimePerUserDisplay: formatDuration(avgTimePerUser),
    idlePercentOfCycle,
    topContributorName: topContributor ? topContributor[0] : '',
    topContributorTime: topContributor ? topContributor[1] : 0,
    topContributorDisplay: topContributor ? formatDuration(topContributor[1]) : '',
    medianSessionSeconds,
    medianSessionDisplay: formatDuration(medianSessionSeconds),
    minSessionDisplay: formatDuration(minSessionSeconds),
    maxSessionDisplay: formatDuration(maxSessionSeconds),
    reworkSessions,
    editTimeSeconds,
    totalSessions,
  };
}


// --- lib/api.js ---


async function requestJson(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const rawText = await response.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}


// --- hooks/dashboard/utils/dataParsers.js ---



function calculateFlowRows(filteredBaseSegments) {
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

  const addMetric = (metricId, seconds) => {
    const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
    if (!Number.isFinite(safeSeconds)) return;
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
      const current = sorted[round2AnchorIdx];
      const nextUserIdx = sorted.findIndex((c, i) => i > round2AnchorIdx && USER_ACTION_TYPES.has(String(c.segmentType || '')));
      if (nextUserIdx > round2AnchorIdx) {
        addMetric('processing-round-2-to-user', (safeNumber(sorted[nextUserIdx].startTs) - safeNumber(current.endTs)) / 1000);
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
}

function calculateUserStatsRows(ganttVisibleSegments) {
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
}


// --- hooks/dashboard/hooks/useDashboardFilters.js ---



function useDashboardFilters(parsedSegments, filters) {
  const {
    selectedFiles,
    selectedSheets,
    selectedUsers,
    selectedSegmentTypes,
    showIdle,
    dateRangeBounds
  } = filters;

  const filteredBaseSegments = useMemo(() => {
    if (parsedSegments.length === 0) return [];
    const fileSet = new Set(selectedFiles);
    const sheetSet = new Set(selectedSheets);
    const userSet = new Set(selectedUsers);
    
    return parsedSegments.filter((segment) => {
      if (segment.endTs < dateRangeBounds.minTs || segment.startTs > dateRangeBounds.maxTs) return false;
      if (sheetSet.size > 0) {
        if (!sheetSet.has(segment.sheetKey)) return false;
      } else if (fileSet.size > 0 && !fileSet.has(segment.fileName)) {
        return false;
      }
      if (userSet.size > 0) {
        const isUserSegment = isUserContextSegment(String(segment.segmentType || ''), segment.userName);
        if (isUserSegment) {
          if (!userSet.has(segment.userName)) return false;
        } else {
          if (!userSet.has('System')) return false;
        }
      }
      return true;
    });
  }, [parsedSegments, dateRangeBounds, selectedFiles, selectedSheets, selectedUsers]);

  const ganttVisibleSegments = useMemo(() => {
    return filteredBaseSegments.filter((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!showIdle && isIdleContextSegment(segmentType)) return false;
      const drillGroup = toDrillGroup(segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return false;
      return true;
    });
  }, [filteredBaseSegments, showIdle, selectedSegmentTypes]);

  return {
    filteredBaseSegments,
    ganttVisibleSegments
  };
}


// --- hooks/dashboard/hooks/useDashboardMetrics.js ---





function useDashboardMetrics(ganttVisibleSegments) {
  const kpiData = useMemo(() => {
    const kpis = ganttVisibleSegments.length > 0 ? buildKpisFromSegments(ganttVisibleSegments) : null;
    return kpis ? buildKpiData(kpis) : initialKpiData;
  }, [ganttVisibleSegments]);

  const flowRows = useMemo(() => calculateFlowRows(ganttVisibleSegments), [ganttVisibleSegments]);

  const userStatsRows = useMemo(() => calculateUserStatsRows(ganttVisibleSegments), [ganttVisibleSegments]);

  const contributionRows = useMemo(() => userStatsRows.map(r => ({ ...r })), [userStatsRows]);
  const matrixRows = useMemo(() => userStatsRows.map(r => ({ ...r, totalActiveSeconds: r.totalSeconds })), [userStatsRows]);

  const workloadContributors = useMemo(() => {
    const laneDurationMap = new Map();
    ganttVisibleSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      const durationSeconds = safeNumber(segment.durationSeconds);
      if (durationSeconds <= 0) return;
      let lane = toTimelineLane(segmentType, segment.userName);
      if (segmentType.startsWith('SYSTEM_')) lane = 'System';
      if (isIdleContextSegment(segmentType)) lane = 'Idle';
      laneDurationMap.set(lane, (laneDurationMap.get(lane) || 0) + durationSeconds);
    });
    return Array.from(laneDurationMap.entries())
      .map(([user, totalSeconds]) => ({ user, totalSeconds }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [ganttVisibleSegments]);

  return {
    kpiData,
    flowRows,
    contributionRows,
    matrixRows,
    workloadContributors
  };
}


// --- hooks/usePersistentState.js ---


function getSavedState(key, defaultValue) {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load saved state for " + key, e);
  }
  return defaultValue;
}

function saveState(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save state for " + key, e);
  }
}

function usePersistentState(key, defaultValue) {
  const [state, setState] = useState(() => getSavedState(key, defaultValue));

  useEffect(() => {
    saveState(key, state);
  }, [key, state]);

  return [state, setState];
}


// --- hooks/useDashboardData.js ---






function useDashboardData() {
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
  const [isFilterInitialized, setIsFilterInitialized] = usePersistentState('filter_isInitialized', false);
  const [activeDocumentFile, setActiveDocumentFile] = usePersistentState('filter_activeDocumentFile', '');
  
  const didInitDocumentDefaultRef = useRef(false);
  const segmentGroupOptions = useMemo(() => ['Uploading', 'Processing', 'Reprocess', 'Review', 'Edit', 'Idle'], []);
  const normalizedSelectedSegmentTypes = useMemo(() => {
    const allowedGroups = new Set(segmentGroupOptions);
    return selectedSegmentTypes.filter((value) => allowedGroups.has(value));
  }, [selectedSegmentTypes, segmentGroupOptions]);

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
      let hasSystemSegment = false;

      for (const seg of parsedSegments) {
        if (seg.endTs < minTs || seg.startTs > maxTs) continue;
        if (useSheetFilter) {
          if (!selectedSheetKeys.has(seg.sheetKey)) continue;
        } else if (selectedFileNames.size > 0 && !selectedFileNames.has(seg.fileName)) {
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
    
    return parsedSegments.filter((segment) => {
      if (segment.endTs < dateRangeBounds.minTs || segment.startTs > dateRangeBounds.maxTs) return false;
      if (sheetSet.size > 0) {
        if (!sheetSet.has(segment.sheetKey)) return false;
      } else if (fileSet.size > 0 && !fileSet.has(segment.fileName)) {
        return false;
      }
      if (userSet.size > 0) {
        const isUserSegment = isUserContextSegment(String(segment.segmentType || ''), segment.userName);
        if (isUserSegment) {
          if (!userSet.has(segment.userName)) return false;
        } else {
          if (!userSet.has('System')) return false;
        }
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
    documentTree, userOptions, segmentTypeOptions,
    ganttVisibleSegments, kpiData, filteredBaseSegments,
    flowRows, contributionRows, matrixRows, workloadContributors,
    refreshAll
  };
}


// --- hooks/useAppController.js ---





function useAppController(dashboard) {
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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


// --- components/shared/KpiSubtext.jsx ---


const KpiSubtext = ({ text }) => {
  const content = String(text || '').trim();
  if (!content) return null;
  const parts = content.split('|').map((item) => item.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <div className="text-xs text-slate-400 mt-2 font-medium leading-snug">{content}</div>;
  }
  return (
    <div className="text-xs text-slate-400 mt-2 font-medium leading-snug space-y-0.5">
      {parts.map((part, idx) => (
        <div key={`${part}-${idx}`} className="truncate" title={part}>{part}</div>
      ))}
    </div>
  );
};


// --- components/shared/Sidebar.jsx ---



const navItemClass = (isActive, isCollapsed) => `flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-all duration-300 group
  ${isCollapsed ? 'px-3.5' : 'px-3'}
  ${isActive ? 'bg-[#e8f7fd] text-[#3860be] border border-[#bfe8f8] shadow-ktb' : 'text-slate-600 hover:bg-[#eef8fd] border border-transparent'}`;

const Sidebar = React.memo(({ isMobileOpen, setMobileOpen, isCollapsed, toggleCollapse, activeView, setActiveView }) => (
  <aside className={`fixed inset-y-0 left-0 z-[150] bg-white border-r border-[#d7e8f6] transition-all duration-300 ease-in-out flex flex-col
    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
    lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:static`}>

    <button
      onClick={toggleCollapse}
      className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-[#bfe8f8] rounded-full items-center justify-center text-slate-500 hover:text-[#00a4e4] hover:border-[#00a4e4] shadow-sm z-50 transition-colors"
    >
      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
    </button>

    {/* Old Text Logo - Saved for future use: 
      <div className="w-9 h-9 flex-shrink-0 bg-[#00a4e4] rounded-lg flex items-center justify-center text-white text-sm font-extrabold shadow-ktb">KTB</div> 
    */}
    <div className={`h-20 shrink-0 flex items-center border-b border-[#d7e8f6] px-6 transition-all duration-300 overflow-hidden ${isCollapsed ? 'justify-center lg:px-0' : 'justify-start'}`}>
      <div className="flex items-center gap-2 min-w-max">
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">
          <img 
            src="https://upload.wikimedia.org/wikipedia/en/f/f0/Krung_Thai_Bank_logo.svg" 
            alt="KTB Logo" 
            className="w-8 h-8 object-contain block"
          />
        </div>
        <span className={`text-2xl font-extrabold tracking-tight text-[#17335f] transition-all duration-300 origin-left ${isCollapsed ? 'opacity-0 w-0 scale-95 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto scale-100 translate-x-0'}`}>
          Analytics
        </span>
      </div>
      <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="p-4 flex-1 overflow-y-auto no-scrollbar overflow-x-hidden">
      <div className={`text-xs font-semibold text-[#3860be]/70 uppercase tracking-wider mb-4 px-3 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 h-0 mb-0' : 'opacity-100 h-auto'}`}>
        Dashboards
      </div>
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('dashboard')} className={navItemClass(activeView === 'dashboard', isCollapsed)} title="Dashboard">
          <LayoutDashboard className={`w-5 h-5 flex-shrink-0 transition-colors ${activeView === 'dashboard' ? 'text-[#00a4e4]' : ''}`} />
          <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto translate-x-0'}`}>
            Dashboard Overview
          </span>
        </a>
      </nav>

      <div className={`text-xs font-semibold text-[#3860be]/70 uppercase tracking-wider mt-8 mb-4 px-3 transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 h-0 mt-0 mb-0' : 'opacity-100 h-auto'}`}>
        Data Management
      </div>
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('data-management')} className={navItemClass(activeView === 'data-management', isCollapsed)} title="Data Management">
          <Database className={`w-5 h-5 flex-shrink-0 transition-colors ${activeView === 'data-management' ? 'text-[#00a4e4]' : ''}`} />
          <span className={`transition-all duration-300 whitespace-nowrap overflow-hidden origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto translate-x-0'}`}>
            Data Management
          </span>
        </a>
      </nav>
    </div>

    <div className="p-4 border-t border-[#d7e8f6]">
      <div className={`flex items-center gap-3 px-3 py-2 transition-all duration-300 ${isCollapsed ? 'justify-center lg:px-0' : 'justify-start'}`}>
        <div className="w-8 h-8 rounded-full bg-[#e8f7fd] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm border border-[#bfe8f8]">
          <User className="w-5 h-5 text-[#3860be]" />
        </div>
        <div className={`transition-all duration-300 whitespace-nowrap overflow-hidden origin-left ${isCollapsed ? 'opacity-0 w-0 translate-x-[-10px] pointer-events-none' : 'opacity-100 w-auto translate-x-0'}`}>
          <div className="text-sm font-semibold text-slate-900 truncate">Executive User</div>
          <div className="text-xs text-slate-500 truncate">Operation Lead</div>
        </div>
      </div>
    </div>
  </aside>
));


// --- components/shared/FilterPopover.jsx ---




const FilterPopover = ({
  id,
  title,
  summary,
  openDropdown,
  setOpenDropdown,
  icon: Icon,
  active = false,
  minWidthClass = 'min-w-[190px]',
  panelClassName = 'w-[360px]',
  children,
}) => {
  const isOpen = openDropdown === id;
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({ top: 0, left: 0, maxHeight: 0 });

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDocumentMouseDown = (event) => {
      const target = event.target;
      const clickedAnchor = rootRef.current && rootRef.current.contains(target);
      const clickedPanel = panelRef.current && panelRef.current.contains(target);
      if (!clickedAnchor && !clickedPanel) {
        setOpenDropdown('');
      }
    };
    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [isOpen, setOpenDropdown]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const updatePanelPosition = () => {
      const anchor = rootRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = panelRef.current?.offsetWidth || 0;
      const viewportPadding = 8;
      const anchorGap = 8;

      let left = rect.left;
      if (panelWidth > 0 && (left + panelWidth) > (window.innerWidth - viewportPadding)) {
        left = rect.right - panelWidth;
      }
      if (panelWidth > 0) {
        left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelWidth - viewportPadding));
      } else {
        left = Math.max(viewportPadding, left);
      }

      const top = Math.max(viewportPadding, rect.bottom + anchorGap);
      const maxHeight = Math.max(120, window.innerHeight - top - viewportPadding);
      setPanelStyle({ top, left, maxHeight });
    };

    updatePanelPosition();
    const raf = requestAnimationFrame(updatePanelPosition);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={`relative shrink-0 ${minWidthClass}`}>
      <button
        onClick={() => setOpenDropdown(isOpen ? '' : id)}
        className={`w-full h-11 rounded-xl border px-3 flex items-center gap-2 transition-colors text-left
          ${active ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
      >
        {Icon ? <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-slate-400'} shrink-0`} /> : null}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{title}</div>
          <div className={`text-sm font-semibold truncate ${active ? 'text-blue-700' : 'text-slate-700'}`}>{summary}</div>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${active ? 'text-blue-400' : 'text-slate-400'} ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen ? createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className={`fixed z-[200] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] overflow-y-auto no-scrollbar ${panelClassName}`}
        >
          {children}
        </div>,
        document.body
      ) : null}
    </div>
  );
};


// --- components/shared/DropdownSearch.jsx ---



const DropdownSearch = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
    />
  </div>
);


// --- components/shared/EmptyState.jsx ---


const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
    <Icon className="w-8 h-8 text-slate-300" />
    <div className="text-sm font-semibold text-slate-500">{title}</div>
    <div className="text-xs text-slate-400">{subtitle}</div>
  </div>
);


// --- features/dashboard/FilterBar.jsx ---






function FilterBar({
  dashboard,
  openDropdown,
  setOpenDropdown,
  userSearchText,
  setUserSearchText,
  segmentTypeSearchText,
  setSegmentTypeSearchText,
  documentFileSearch,
  setDocumentFileSearch,
  documentSheetSearch,
  setDocumentSheetSearch,
  onMenuClick,
}) {
  const {
    loading, syncing, refreshAll,
    datePreset, setDatePreset, dateStart, setDateStart, dateEnd, setDateEnd,
    selectedFiles, setSelectedFiles, selectedSheets, setSelectedSheets,
    selectedUsers, setSelectedUsers, selectedSegmentTypes, setSelectedSegmentTypes,
    selectedSystemStages, setSelectedSystemStages,
    pinnedFiles, setPinnedFiles, pinnedSheets, setPinnedSheets,
    activeDocumentFile, setActiveDocumentFile,
    documentTree, userOptions, segmentTypeOptions, systemStageOptions
  } = dashboard;

  const toggleSelectedValue = (setter, value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const togglePin = (setter, value) => {
    setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [value, ...prev]));
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
      setSelectedFiles(documentTree.map(t => t.fileName));
    }
  };

  const pinnedFileSet = new Set(pinnedFiles);
  const pinnedSheetSet = new Set(pinnedSheets);

  const filteredDocumentTree = documentTree
    .filter((item) => item.fileName.toLowerCase().includes(documentFileSearch.trim().toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedFileSet.has(a.fileName);
      const bPinned = pinnedFileSet.has(b.fileName);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const activeDocumentEntry = documentTree.find((item) => item.fileName === activeDocumentFile) || null;
  const filteredSheetsForActiveFile = activeDocumentEntry 
    ? activeDocumentEntry.sheets
        .filter((sheet) => sheet.toLowerCase().includes(documentSheetSearch.trim().toLowerCase()))
        .sort((a, b) => {
          const aKey = buildSheetKey(activeDocumentFile, a);
          const bKey = buildSheetKey(activeDocumentFile, b);
          const aPinned = pinnedSheetSet.has(aKey);
          const bPinned = pinnedSheetSet.has(bKey);
          if (aPinned && !bPinned) return -1;
          if (!aPinned && bPinned) return 1;
          return 0;
        })
    : [];

  const filteredUserOptions = userOptions.filter((userName) => 
    userName.toLowerCase().includes(userSearchText.trim().toLowerCase())
  );

  const filteredSegmentTypeOptions = segmentTypeOptions.map((value) => ({
    label: value,
    value,
  })).filter((option) => {
    const searchText = segmentTypeSearchText.trim().toLowerCase();
    return option.label.toLowerCase().includes(searchText) || option.value.toLowerCase().includes(searchText);
  });

  const selectedFileSet = new Set(selectedFiles);
  const selectedSheetSet = new Set(selectedSheets);
  const selectedUserSet = new Set(selectedUsers);
  const selectedSegmentTypeSet = new Set(selectedSegmentTypes);

  return (
    <header className="shrink-0 bg-white/90 backdrop-blur-md border-b border-[#d7e8f6] px-4 md:px-8 py-3 z-[80]">
      <div className="max-w-[1600px] mx-auto flex items-center gap-2 md:gap-3">
        
        <div className="flex-1 flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar py-0.5">
          {/* Mobile Menu Trigger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-[#3860be] transition-colors shrink-0"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Date Filter */}
          <FilterPopover
            id="date-range"
            title="Date Range"
            summary={datePreset === 'all' ? 'All Time' : (datePreset === 'custom' ? `${dateStart} - ${dateEnd}` : datePreset)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={Calendar}
            active={datePreset !== 'all'}
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {['all', '7d', '30d', '90d'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDatePreset(preset)}
                    className={`h-9 rounded-lg text-sm font-semibold transition-colors ${datePreset === preset ? 'bg-[#00a4e4] text-white shadow-sm' : 'bg-[#f6fbff] text-slate-600 hover:bg-[#e8f7fd]'}`}
                  >
                    {preset === 'all' ? 'All Time' : (preset === '7d' ? 'Last 7 Days' : (preset === '30d' ? 'Last 30 Days' : 'Last 90 Days'))}
                  </button>
                ))}
                <button
                  onClick={() => setDatePreset('custom')}
                  className={`h-9 rounded-lg text-sm font-semibold transition-colors col-span-2 ${datePreset === 'custom' ? 'bg-[#00a4e4] text-white shadow-sm' : 'bg-[#f6fbff] text-slate-600 hover:bg-[#e8f7fd]'}`}
                >
                  Custom Range
                </button>
              </div>

              {datePreset === 'custom' && (
                <div className="space-y-3 pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Start Date</label>
                      <input
                        type="date"
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">End Date</label>
                      <input
                        type="date"
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FilterPopover>

          {/* Document Filter */}
          <FilterPopover
            id="document-file"
            title="Documents"
            summary={selectedFiles.length === 0 && selectedSheets.length === 0 ? 'All Documents' : (selectedSheets.length > 0 ? `${selectedSheets.length} Sheets` : `${selectedFiles.length} Files`)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={FileText}
            active={selectedFiles.length > 0 || selectedSheets.length > 0}
            minWidthClass="min-w-[240px]"
            panelClassName="w-[640px] max-w-[92vw]"
          >
            <div className="flex h-[420px] divide-x divide-slate-100">
              {/* File List */}
              <div className="w-1/2 flex flex-col">
                <div className="p-3 border-b border-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Source Files</div>
                    <button onClick={() => setSelectedFiles([])} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">Clear</button>
                  </div>
                  <DropdownSearch value={documentFileSearch} onChange={setDocumentFileSearch} placeholder="Search files..." />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
                  {filteredDocumentTree.map((item) => {
                    const isPinned = pinnedFileSet.has(item.fileName);
                    return (
                      <div
                        key={item.fileName}
                        onClick={() => setActiveDocumentFile(item.fileName)}
                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeDocumentFile === item.fileName ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFileSet.has(item.fileName)}
                          onChange={(e) => { e.stopPropagation(); toggleFileSelection(item.fileName, selectedFileSet.has(item.fileName)); }}
                          className="h-4 w-4 accent-blue-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${activeDocumentFile === item.fileName ? 'text-blue-700' : 'text-slate-700'}`}>{item.fileName}</div>
                          <div className="text-[10px] text-slate-400 font-medium">{item.sheets.length} sheets</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(setPinnedFiles, item.fileName); }}
                            className={`p-1 rounded-md transition-all ${isPinned ? 'text-blue-500 opacity-100 bg-blue-50' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100'}`}
                          >
                            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                          </button>
                          <ChevronRight className={`w-4 h-4 transition-transform ${activeDocumentFile === item.fileName ? 'text-blue-400 translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Sheet List */}
              <div className="w-1/2 flex flex-col bg-slate-50/30">
                <div className="p-3 border-b border-slate-50 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sheets for selected file</div>
                  <DropdownSearch value={documentSheetSearch} onChange={setDocumentSheetSearch} placeholder="Search sheets..." />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
                  {!activeDocumentEntry ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center opacity-40">
                      <Database className="w-8 h-8 text-slate-300 mb-2" />
                      <div className="text-xs font-medium text-slate-400">Select a file to see sheets</div>
                    </div>
                  ) : filteredSheetsForActiveFile.length === 0 ? (
                    <div className="p-4 text-xs text-slate-400 text-center">No sheets found</div>
                  ) : (
                    filteredSheetsForActiveFile.map((sheet) => {
                      const sheetKey = buildSheetKey(activeDocumentFile, sheet);
                      const isChecked = selectedSheetSet.has(sheetKey);
                      const isPinned = pinnedSheetSet.has(sheetKey);
                      return (
                        <div key={sheet} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSheetSelection(activeDocumentFile, sheet)}
                            className="h-4 w-4 accent-blue-600 rounded"
                          />
                          <span className="flex-1 text-sm font-medium text-slate-700 truncate">{sheet}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePin(setPinnedSheets, sheetKey); }}
                            className={`p-1 rounded-md transition-all ${isPinned ? 'text-blue-500 opacity-100 bg-blue-50' : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500 hover:bg-slate-100'}`}
                          >
                            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </FilterPopover>

          {/* User Filter */}
          <FilterPopover
            id="user-filter"
            title="Users"
            summary={selectedUsers.length === 0 ? 'All Users' : `${selectedUsers.length} Users`}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={Users}
            active={selectedUsers.length > 0}
          >
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Users</div>
                <button onClick={() => setSelectedUsers([])} className="text-[11px] font-semibold text-slate-400">Clear</button>
              </div>
              <DropdownSearch value={userSearchText} onChange={setUserSearchText} placeholder="Search user..." />
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                {filteredUserOptions.map((userName) => (
                  <label key={userName} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserSet.has(userName)}
                      onChange={() => toggleSelectedValue(setSelectedUsers, userName)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <span className="text-sm text-slate-700 truncate">{userName}</span>
                  </label>
                ))}
              </div>
            </div>
          </FilterPopover>

          {/* Segment Filter */}
          <FilterPopover
            id="segment-type"
            title="Segment"
            summary={selectedSegmentTypes.length === 0 ? 'Segment Type' : (selectedSegmentTypes.length === 1 ? selectedSegmentTypes[0] : `${selectedSegmentTypes.length} Types`)}
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
            icon={LayoutDashboard}
            active={selectedSegmentTypes.length > 0}
            minWidthClass="min-w-[210px]"
            panelClassName="w-[380px] max-w-[92vw]"
          >
            <div className="p-3 space-y-3">
               <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Segment Type</div>
                <button onClick={() => setSelectedSegmentTypes([])} className="text-[11px] font-semibold text-slate-400">Clear</button>
              </div>
              <DropdownSearch value={segmentTypeSearchText} onChange={setSegmentTypeSearchText} placeholder="Search segment..." />
              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                {filteredSegmentTypeOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSegmentTypeSet.has(option.value)}
                      onChange={() => toggleSelectedValue(setSelectedSegmentTypes, option.value)}
                      className="h-4 w-4 accent-blue-600 rounded"
                    />
                    <div className="min-w-0 text-sm font-medium text-slate-700 truncate">{option.label}</div>
                  </label>
                ))}
              </div>
            </div>
          </FilterPopover>

        </div>

        {/* Refresh Button */}
        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-[#d7e8f6]">
          <button
            onClick={() => refreshAll()}
            disabled={loading || syncing}
            className="h-10 px-4 rounded-xl border border-[#bfe8f8] bg-white text-sm font-semibold text-[#3860be] hover:bg-[#e8f7fd] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2 shadow-ktb"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || syncing) ? 'animate-spin' : ''}`} />
            {loading || syncing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>
    </header>
  );
}


// --- features/timeline/timelineUtils.js ---



/**
 * Maps raw segments into parsed rows for the Gantt chart.
 */
const mapSegmentsToRows = (segments, singleLane) => {
  const parsedRows = [];
  const reopenMarkers = [];

  (segments || []).forEach((segment, idx) => {
    const startTs = Date.parse(segment.start || '');
    const endTsRaw = Date.parse(segment.end || '');
    if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return;

    const segmentType = String(segment.segmentType || 'UNKNOWN');
    const contextKey = String(segment.documentId || `${segment.fileName || ''}::${segment.pageName || ''}`);

    if (segmentType === 'AUTO_TIMEOUT_MARKER') return;
    if (REOPEN_MARKER_TYPES.has(segmentType)) {
      reopenMarkers.push({ contextKey, ts: startTs, markerType: segmentType });
      return;
    }

    const lane = singleLane ? 'All user' : toTimelineLane(segmentType, segment.userName);

    parsedRows.push({
      id: `${segmentType}-${idx}`,
      segmentType,
      lane,
      userName: segment.userName,
      origLane: toTimelineLane(segmentType, segment.userName),
      startTs,
      endTs: Math.max(endTsRaw, startTs + 1000),
      durationSeconds: safeNumber(segment.durationSeconds),
      start: segment.start,
      end: segment.end,
      timeGroup: String(segment.timeGroup || ''),
      drillGroup: toDrillGroup(segmentType),
      documentId: segment.documentId || '',
      fileName: segment.fileName || '',
      pageName: segment.pageName || '',
      autoTimeout: Boolean(segment.autoTimeout),
      contextKey,
      reopenMarkerList: [],
      hasReprocessRound2CompleteMarker: segmentType === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2',
    });
  });

  if (reopenMarkers.length === 0 || parsedRows.length === 0) return parsedRows;

  const userBarsByContext = new Map();
  parsedRows.forEach((row) => {
    if (!String(row.segmentType || '').startsWith('USER_')) return;
    if (!userBarsByContext.has(row.contextKey)) userBarsByContext.set(row.contextKey, []);
    userBarsByContext.get(row.contextKey).push(row);
  });
  userBarsByContext.forEach((rows) => rows.sort((a, b) => a.startTs - b.startTs));

  reopenMarkers.forEach((marker) => {
    const candidateBars = userBarsByContext.get(marker.contextKey);
    if (!candidateBars || candidateBars.length === 0) return;

    let targetBar = candidateBars.find((bar) => marker.ts >= bar.startTs && marker.ts <= bar.endTs);
    if (!targetBar) targetBar = candidateBars.find((bar) => bar.startTs >= marker.ts);
    if (!targetBar) targetBar = candidateBars[candidateBars.length - 1];
    targetBar.reopenMarkerList.push({
      ts: marker.ts,
      markerType: marker.markerType || 'REOPEN_MARKER',
    });
  });

  return parsedRows;
};

/**
 * Calculates compaction and gaps for time gaps.
 */
const calculateTimeCompaction = (segments, displayMinTs, displayMaxTs, showIdleLane, showSystemLane) => {
  const COMPACTION_THRESHOLD_MS = 30 * 1000;
  const VISUAL_GAP_MS = 10 * 1000;

  const activeIntervals = [];
  segments.forEach((seg) => {
    if (seg.origLane === 'Idle' && !showIdleLane) return;
    if (seg.origLane === 'System' && !showSystemLane) return;
    activeIntervals.push({ start: seg.startTs, end: seg.endTs });
  });
  segments.forEach((seg) => {
    if (Array.isArray(seg.reopenMarkerList)) {
      seg.reopenMarkerList.forEach((m) => {
        activeIntervals.push({ start: m.ts, end: m.ts });
      });
    }
  });

  activeIntervals.sort((a, b) => a.start - b.start);

  const mergedIntervals = [];
  activeIntervals.forEach((interval) => {
    const prev = mergedIntervals[mergedIntervals.length - 1];
    if (!prev) {
      mergedIntervals.push({ ...interval });
      return;
    }
    if (interval.start <= prev.end + 5 * 1000) {
      prev.end = Math.max(prev.end, interval.end);
    } else {
      mergedIntervals.push({ ...interval });
    }
  });

  const gaps = [];
  let lastRealTs = displayMinTs;
  mergedIntervals.forEach((interval) => {
    if (interval.start > lastRealTs + COMPACTION_THRESHOLD_MS) {
      gaps.push({
        start: lastRealTs,
        end: interval.start,
        originalSpan: interval.start - lastRealTs,
        excessSpan: (interval.start - lastRealTs) - VISUAL_GAP_MS,
      });
    }
    lastRealTs = interval.end;
  });
  if (displayMaxTs > lastRealTs + COMPACTION_THRESHOLD_MS) {
    gaps.push({
      start: lastRealTs,
      end: displayMaxTs,
      originalSpan: displayMaxTs - lastRealTs,
      excessSpan: (displayMaxTs - lastRealTs) - VISUAL_GAP_MS,
    });
  }

  const getCompactedTs = (realTs) => {
    let excessSum = 0;
    for (const gap of gaps) {
      if (realTs > gap.end) {
        excessSum += gap.excessSpan;
      } else if (realTs > gap.start) {
        const fraction = (realTs - gap.start) / gap.originalSpan;
        excessSum += fraction * gap.excessSpan;
      }
    }
    return realTs - excessSum;
  };

  return { getCompactedTs, gaps };
};

/**
 * Calculates ticks for the timeline.
 */
const calculateTimelineTicks = (displayMinTs, displayMaxTs, effectivePxPerHour, collapseGaps, visibleSegments) => {
  const tickStepCandidatesMs = [
    30 * 60 * 1000, 60 * 60 * 1000, 2 * 60 * 60 * 1000, 3 * 60 * 60 * 1000,
    4 * 60 * 60 * 1000, 6 * 60 * 60 * 1000, 8 * 60 * 60 * 1000, 12 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ];
  const minTickPx = 120;
  const tickStepMs = tickStepCandidatesMs.find(
    (candidate) => ((candidate / (60 * 60 * 1000)) * effectivePxPerHour) >= minTickPx
  ) || (24 * 60 * 60 * 1000);
  
  const alignedTickStart = Math.floor(displayMinTs / tickStepMs) * tickStepMs;
  let ticks = [];
  for (let tickTs = alignedTickStart; tickTs <= displayMaxTs + tickStepMs; tickTs += tickStepMs) {
    if (tickTs >= displayMinTs && tickTs <= displayMaxTs) {
      ticks.push(tickTs);
    }
  }
  if (ticks.length === 0) ticks.push(displayMinTs);
  if (ticks[ticks.length - 1] < displayMaxTs) ticks.push(displayMaxTs);

  if (collapseGaps) {
    ticks = ticks.filter((tickTs) => {
      if (tickTs === displayMinTs || tickTs === displayMaxTs) return true;
      return visibleSegments.some((seg) => {
        return tickTs >= seg.startTs - 2 * 60 * 1000 && tickTs <= seg.endTs + 2 * 60 * 1000;
      });
    });
  }
  return ticks;
};


// --- features/timeline/ganttLayoutUtils.js ---



const GANTT_GAP_COMPACTION_THRESHOLD_MS = 30 * 1000;
const GANTT_VISUAL_GAP_MS = 10 * 1000;
const GANTT_TICK_STEP_CANDIDATES_MS = [
  1800000, 3600000, 7200000, 10800000, 14400000,
  21600000, 28800000, 43200000, 86400000
];

function buildGanttLegendItems(showIdleLane, showSystemLane, showStarMarkers) {
  const items = GANTT_DRILL_GROUPS.filter((item) => {
    if (item.key === 'Reprocessing' || item.key === 'ReviewAutoClose') return false;
    if (!showIdleLane && item.key === 'Idle') return false;
    if (!showSystemLane && item.key === 'Processing') return false;
    if (!showStarMarkers && item.key === 'EditAndComplete') return false;
    return true;
  });

  if (showStarMarkers) {
    items.push({ key: 'MarkerAutoTimeout', label: 'Auto Closed', color: '#EF4444', isStar: true });
    items.push({ key: 'MarkerReopen', label: 'Reopen', color: '#A855F7', isStar: true });
  }

  return items;
}

function buildGanttDisplayBounds(laneVisibleSegments, mappedSegments) {
  const boundsSegments = laneVisibleSegments.length > 0 ? laneVisibleSegments : mappedSegments;
  if (boundsSegments.length === 0) {
    const nowTs = Date.now();
    return { displayMinTs: nowTs - 60000, displayMaxTs: nowTs + 60000 };
  }
  const fMin = boundsSegments.reduce((min, item) => Math.min(min, item.startTs), boundsSegments[0].startTs);
  const fMax = boundsSegments.reduce((max, item) => Math.max(max, item.endTs), boundsSegments[0].endTs);
  const pad = Math.min(10 * 60 * 1000, Math.max(1 * 60 * 1000, (fMax - fMin) * 0.005));
  return { displayMinTs: fMin - pad, displayMaxTs: fMax + pad };
}

function buildGanttGapInfo(collapseGaps, visibleSegments, displayMinTs, displayMaxTs) {
  if (!collapseGaps || visibleSegments.length === 0) {
    return { gaps: [], compactedMinTs: displayMinTs, compactedMaxTs: displayMaxTs, totalExcess: 0 };
  }

  const activeIntervals = [];
  visibleSegments.forEach((seg) => {
    activeIntervals.push({ start: seg.startTs, end: seg.endTs });
    if (Array.isArray(seg.reopenMarkerList)) {
      seg.reopenMarkerList.forEach((marker) => activeIntervals.push({ start: marker.ts, end: marker.ts }));
    }
  });

  activeIntervals.sort((a, b) => a.start - b.start);

  const merged = [];
  activeIntervals.forEach((interval) => {
    const prev = merged[merged.length - 1];
    if (!prev) {
      merged.push({ ...interval });
      return;
    }
    if (interval.start <= prev.end + 5000) {
      prev.end = Math.max(prev.end, interval.end);
      return;
    }
    merged.push({ ...interval });
  });

  const gaps = [];
  let lastTs = displayMinTs;
  let cumulativeExcess = 0;

  merged.forEach((interval) => {
    if (interval.start > lastTs + GANTT_GAP_COMPACTION_THRESHOLD_MS) {
      const span = interval.start - lastTs;
      const excess = span - GANTT_VISUAL_GAP_MS;
      gaps.push({ start: lastTs, end: interval.start, originalSpan: span, excessSpan: excess, cumulativeExcess });
      cumulativeExcess += excess;
    }
    lastTs = interval.end;
  });

  const lastSpan = displayMaxTs - lastTs;
  if (lastSpan > GANTT_GAP_COMPACTION_THRESHOLD_MS) {
    const excess = lastSpan - GANTT_VISUAL_GAP_MS;
    gaps.push({ start: lastTs, end: displayMaxTs, originalSpan: lastSpan, excessSpan: excess, cumulativeExcess });
    cumulativeExcess += excess;
  }

  return {
    gaps,
    compactedMinTs: displayMinTs,
    compactedMaxTs: displayMaxTs - cumulativeExcess,
    totalExcess: cumulativeExcess,
  };
}

function compactGanttTimestamp(realTs, gaps) {
  if (!Array.isArray(gaps) || gaps.length === 0) return realTs;

  let low = 0;
  let high = gaps.length - 1;
  let foundGap = null;
  let prevGapsExcess = 0;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const gap = gaps[mid];
    if (realTs < gap.start) {
      high = mid - 1;
    } else if (realTs > gap.end) {
      prevGapsExcess = gap.cumulativeExcess + gap.excessSpan;
      low = mid + 1;
    } else {
      foundGap = gap;
      break;
    }
  }

  if (!foundGap) return realTs - prevGapsExcess;

  const fraction = (realTs - foundGap.start) / foundGap.originalSpan;
  return realTs - (foundGap.cumulativeExcess + fraction * foundGap.excessSpan);
}

function buildGanttLanes(visibleSegments, showSystemLane, showIdleLane) {
  const laneDurationMap = {};
  visibleSegments.forEach((item) => {
    if (!laneDurationMap[item.lane]) laneDurationMap[item.lane] = 0;
    laneDurationMap[item.lane] += item.durationSeconds;
  });

  return Object.keys(laneDurationMap).sort((a, b) => {
    const priority = (name) => name === 'System' ? 1 : (name === 'Idle' ? 2 : 3);
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return (laneDurationMap[b] - laneDurationMap[a]) || a.localeCompare(b);
  }).filter((lane) => (showSystemLane || lane !== 'System') && (showIdleLane || lane !== 'Idle'));
}

function buildGanttLaneSegments(lanes, visibleSegments) {
  const groups = {};
  visibleSegments.forEach((segment) => {
    if (!groups[segment.lane]) groups[segment.lane] = [];
    groups[segment.lane].push(segment);
  });

  const result = {};
  lanes.forEach((lane) => {
    const segments = (groups[lane] || []).sort((a, b) => a.startTs - b.startTs);
    result[lane] = mergeContinuousReprocessingSegments(segments);
  });
  return result;
}

function buildGanttPositionedBars(config) {
  const {
    lanes,
    laneToSegments,
    compactTs,
    displayMinTs,
    displayMaxTs,
    baseCompactedTs,
    pxPerMs,
    timelinePadLeft,
  } = config;

  const result = {};
  lanes.forEach((lane) => {
    const bars = laneToSegments[lane] || [];
    const positioned = [];
    let lastRight = -1;

    bars.forEach((segment) => {
      const x1 = timelinePadLeft + (compactTs(Math.max(segment.startTs, displayMinTs)) - baseCompactedTs) * pxPerMs;
      const x2 = timelinePadLeft + (compactTs(Math.min(segment.endTs, displayMaxTs)) - baseCompactedTs) * pxPerMs;

      let x = x1;
      const minWidth = segment.segmentType === 'USER_UPLOADING' ? 14 : 8;
      const width = Math.max(minWidth, x2 - x1);

      if (x < lastRight + 1.5) x = lastRight + 1.5;

      positioned.push({ s: segment, x, w: width });
      lastRight = x + width;
    });
    result[lane] = positioned;
  });
  return result;
}

function buildGanttTicks(config) {
  const {
    timelineWidth,
    displaySpanHours,
    displayMinTs,
    displayMaxTs,
    collapseGaps,
    visibleSegments,
    getX,
  } = config;

  const effPxPerHour = timelineWidth / Math.max(displaySpanHours, 1);
  const step = GANTT_TICK_STEP_CANDIDATES_MS.find((candidate) => (candidate / 3600000 * effPxPerHour) >= 120) || 86400000;
  const start = Math.floor(displayMinTs / step) * step;
  let ticks = [];

  for (let tickTs = start; tickTs <= displayMaxTs + step; tickTs += step) {
    if (tickTs >= displayMinTs && tickTs <= displayMaxTs) ticks.push(tickTs);
  }
  if (ticks.length === 0) ticks.push(displayMinTs);
  if (ticks[ticks.length - 1] < displayMaxTs) ticks.push(displayMaxTs);

  if (collapseGaps) {
    ticks = ticks.filter((tickTs) => {
      if (tickTs === displayMinTs || tickTs === displayMaxTs) return true;
      return visibleSegments.some((segment) => tickTs >= segment.startTs - 120000 && tickTs <= segment.endTs + 120000);
    });
  }

  const finalTicks = [];
  ticks.sort((a, b) => a - b).forEach((tickTs) => {
    if (finalTicks.length === 0) {
      finalTicks.push(tickTs);
      return;
    }

    const lastX = getX(finalTicks[finalTicks.length - 1]);
    const currX = getX(tickTs);
    if (tickTs === displayMaxTs) {
      if (currX - lastX >= 65) finalTicks.push(tickTs);
      else if (finalTicks.length > 1) finalTicks[finalTicks.length - 1] = tickTs;
    } else if (currX - lastX >= 65) {
      finalTicks.push(tickTs);
    }
  });
  return finalTicks;
}

function getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, laneCount) {
  const bufferLanes = 3;
  const startLaneIdx = Math.max(0, Math.floor((scrollState.top - rowTopPadding) / rowSlotHeight) - bufferLanes);
  const endLaneIdx = Math.min(laneCount - 1, Math.ceil((scrollState.top + scrollState.viewH) / rowSlotHeight) + bufferLanes);
  return { startLaneIdx, endLaneIdx };
}


// --- features/timeline/GanttTimelineParts.jsx ---




const GanttLegend = ({ items }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600">
    {items.map((item) => (
      <span key={item.key} className="inline-flex items-center gap-1.5">
        {item.isStar || item.key === 'EditAndComplete' ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={item.color}>
            <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
          </svg>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
        )}
        {item.label}
      </span>
    ))}
  </div>
);

const GanttHeader = ({ laneLabelWidth, headerScrollRef, timelineSvgWidth, headerHeight, visibleTicks, getX }) => (
  <div className="flex border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-0 z-20">
    <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 p-3 flex items-center">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lane</span>
    </div>
    <div ref={headerScrollRef} className="flex-1 overflow-hidden no-scrollbar">
      <svg width={timelineSvgWidth} height={headerHeight}>
        {visibleTicks.map((tick, idx) => {
          const x = getX(tick);
          const header = formatTickHeader(tick);
          const showDate = idx === 0 || !isSameCalendarDay(visibleTicks[idx - 1], tick);
          return (
            <g key={tick}>
              <line x1={x} x2={x} y1={headerHeight - 15} y2={headerHeight} stroke="#CBD5E1" />
              <text x={x} y="18" textAnchor="middle" className="fill-slate-500 text-[10px] font-medium">
                <tspan x={x}>{showDate ? header.dateLabel : ''}</tspan>
                <tspan x={x} dy="13">{header.timeLabel}</tspan>
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  </div>
);

const GanttLaneLabels = ({ visibleLanes, lanes, laneLabelWidth, rowTopPadding, rowSlotHeight, rowHeight }) => (
  <div style={{ width: laneLabelWidth }} className="shrink-0 border-r border-slate-200 bg-white relative">
    {visibleLanes.map((lane) => {
      const idx = lanes.indexOf(lane);
      const y = rowTopPadding + idx * rowSlotHeight;
      return (
        <div key={lane} style={{ position: 'absolute', top: y, width: '100%', height: rowHeight }} className="px-3 flex items-center border-b border-slate-50">
          <span className="text-[11px] font-semibold text-slate-700 truncate">{lane}</span>
        </div>
      );
    })}
  </div>
);

const GanttBarsSvg = ({
  timelineSvgWidth,
  bodyChartHeight,
  visibleTicks,
  visibleLanes,
  lanes,
  laneToPositionedBars,
  rowTopPadding,
  rowSlotHeight,
  rowHeight,
  scrollState,
  showStarMarkers,
  getX,
  onPickSegment,
  onShowTooltip,
  onHideTooltip,
}) => (
  <svg width={timelineSvgWidth} height={bodyChartHeight} className="block bg-white/50">
    {visibleTicks.map((tick) => (
      <line key={tick} x1={getX(tick)} x2={getX(tick)} y1={0} y2={bodyChartHeight} stroke="#F1F5F9" />
    ))}

    {visibleLanes.map((lane) => {
      const laneIdx = lanes.indexOf(lane);
      const y = rowTopPadding + laneIdx * rowSlotHeight;
      const positionedBars = laneToPositionedBars[lane] || [];
      const leftBound = scrollState.left - 500;
      const rightBound = scrollState.left + scrollState.viewW + 500;

      return (
        <g key={`bars-${lane}`}>
          {positionedBars.map((positioned, barIdx) => {
            const { s, x, w } = positioned;
            if (x + w < leftBound || x > rightBound) return null;

            const color = lane === 'Idle'
              ? '#94A3B8'
              : (GANTT_DRILL_GROUP_COLORS[s.drillGroup] || SEGMENT_COLORS[s.segmentType] || '#64748B');
            return (
              <g
                key={`${s.id}-${barIdx}`}
                onClick={() => onPickSegment(s)}
                onMouseEnter={(event) => onShowTooltip(event, s, lane, color)}
                onMouseMove={(event) => onShowTooltip(event, s, lane, color)}
                onMouseLeave={onHideTooltip}
                style={{ cursor: 'pointer' }}
              >
                <rect x={x} y={y + 4} width={w} height={rowHeight - 8} rx="6" fill={color} opacity="0.9" />
              </g>
            );
          })}
        </g>
      );
    })}

    {showStarMarkers && visibleLanes.map((lane) => {
      const laneIdx = lanes.indexOf(lane);
      const y = rowTopPadding + laneIdx * rowSlotHeight;
      const positionedBars = laneToPositionedBars[lane] || [];
      const leftBound = scrollState.left - 500;
      const rightBound = scrollState.left + scrollState.viewW + 500;

      return (
        <g key={`stars-${lane}`}>
          {positionedBars.map((positioned, barIdx) => {
            const { s, x, w } = positioned;
            if (x + w < leftBound || x > rightBound) return null;
            const hasStars = (s.segmentType === 'USER_REVIEW_AUTO_TIMEOUT' || s.autoTimeout)
              || toCompleteMarkerType(s)
              || (s.reopenMarkerList && s.reopenMarkerList.length > 0);
            if (!hasStars) return null;

            const color = lane === 'Idle'
              ? '#94A3B8'
              : (GANTT_DRILL_GROUP_COLORS[s.drillGroup] || SEGMENT_COLORS[s.segmentType] || '#64748B');

            return (
              <g
                key={`star-${s.id}-${barIdx}`}
                onClick={() => onPickSegment(s)}
                onMouseEnter={(event) => onShowTooltip(event, s, lane, color)}
                onMouseMove={(event) => onShowTooltip(event, s, lane, color)}
                onMouseLeave={onHideTooltip}
                style={{ cursor: 'pointer' }}
              >
                {(s.segmentType === 'USER_REVIEW_AUTO_TIMEOUT' || s.autoTimeout) && (
                  <polygon points={buildAsteriskPoints(x + w - 2, y + rowHeight / 2, MARKER_STAR_OUTER_RADIUS, MARKER_STAR_INNER_RADIUS)} fill="#EF4444" />
                )}
                {toCompleteMarkerType(s) && (
                  <polygon points={buildAsteriskPoints(x + w + 4, y + rowHeight / 2, MARKER_STAR_OUTER_RADIUS, MARKER_STAR_INNER_RADIUS)} fill={COMPLETE_MARKER_COLOR} />
                )}
                {s.reopenMarkerList && s.reopenMarkerList.length > 0 && (
                  <polygon points={buildAsteriskPoints(x + 2, y + rowHeight / 2, MARKER_STAR_OUTER_RADIUS, MARKER_STAR_INNER_RADIUS)} fill="#A855F7" />
                )}
              </g>
            );
          })}
        </g>
      );
    })}
  </svg>
);

const GanttTooltip = ({ hoveredSegment }) => {
  if (!hoveredSegment) return null;

  return (
    <div
      className="pointer-events-none absolute z-[200] w-[280px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-3.5 shadow-ktb animate-in fade-in zoom-in duration-150"
      style={{
        left: hoveredSegment.x,
        top: hoveredSegment.y,
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <div 
          className="w-2.5 h-2.5 rounded-full" 
          style={{ 
            backgroundColor: hoveredSegment.color || '#00a4e4',
            boxShadow: `0 0 10px ${(hoveredSegment.color || '#00a4e4')}66`
          }}
        />
        <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">
          {toGanttSegmentTypeLabel(hoveredSegment.segmentType)}
        </div>
      </div>
      <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
        <div className="flex justify-between items-center pb-1 border-b border-slate-50">
          <span>Lane</span>
          <span className="text-[#17335f] text-[12px]">{hoveredSegment.lane}</span>
        </div>
        <div className="flex justify-between items-center pb-1 border-b border-slate-50">
          <span>Duration</span>
          <span className="text-[#00a4e4] text-[14px] font-bold">{formatDuration(hoveredSegment.durationSeconds)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Time</span>
          <span className="text-slate-600 font-medium">
            {formatTimeTick(hoveredSegment.start)} - {formatTimeTick(hoveredSegment.end)}
          </span>
        </div>
      </div>
    </div>
  );
};


// --- features/timeline/GanttTimelineChart.jsx ---






const GanttTimelineChart = ({
  segments,
  onSelectSegment,
  expanded = false,
  singleLane = false,
  showSystemLane = true,
  showIdleLane = true,
  showStarMarkers = true,
  collapseGaps = false,
  showGanttLegend = true,
}) => {
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const zoomScaleRef = useRef(1);
  const pendingZoomAnchorRef = useRef(null);
  const scrollRequestRef = useRef(null);

  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [scrollState, setScrollState] = useState({ left: 0, top: 0, viewW: 1000, viewH: 600 });

  const mapped = useMemo(() => mapSegmentsToRows(segments, singleLane), [segments, singleLane]);

  useEffect(() => {
    const updateSize = () => {
      if (!bodyScrollRef.current) return;
      setScrollState((prev) => ({
        ...prev,
        viewW: bodyScrollRef.current.clientWidth,
        viewH: verticalScrollRef.current?.clientHeight || 600,
      }));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
      setScrollState((prev) => ({ ...prev, left: 0, top: 0 }));
    });
  }, [mapped.length]);

  const laneVisibleSegments = useMemo(() => mapped.filter((segment) => {
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, showSystemLane, showIdleLane]);

  const { displayMinTs, displayMaxTs } = useMemo(
    () => buildGanttDisplayBounds(laneVisibleSegments, mapped),
    [laneVisibleSegments, mapped]
  );

  const visibleSegments = useMemo(() => mapped.filter((segment) => {
    if (segment.endTs < displayMinTs || segment.startTs > displayMaxTs) return false;
    if (!showSystemLane && segment.origLane === 'System') return false;
    if (!showIdleLane && segment.origLane === 'Idle') return false;
    return true;
  }), [mapped, displayMinTs, displayMaxTs, showSystemLane, showIdleLane]);

  const gapsInfo = useMemo(
    () => buildGanttGapInfo(collapseGaps, visibleSegments, displayMinTs, displayMaxTs),
    [collapseGaps, visibleSegments, displayMinTs, displayMaxTs]
  );

  const compactTs = useCallback(
    (realTs) => compactGanttTimestamp(realTs, gapsInfo.gaps),
    [gapsInfo]
  );

  const displaySpanMs = Math.max(displayMaxTs - displayMinTs - gapsInfo.totalExcess, 60000);
  const displaySpanHours = displaySpanMs / 3600000;
  const pxPerHour = 120;
  const legendItems = useMemo(
    () => buildGanttLegendItems(showIdleLane, showSystemLane, showStarMarkers),
    [showIdleLane, showSystemLane, showStarMarkers]
  );

  const lanes = useMemo(
    () => buildGanttLanes(visibleSegments, showSystemLane, showIdleLane),
    [visibleSegments, showSystemLane, showIdleLane]
  );

  const laneToSegments = useMemo(
    () => buildGanttLaneSegments(lanes, visibleSegments),
    [lanes, visibleSegments]
  );

  const timelinePadLeft = 14;
  const timelinePadRight = 18;
  const minTimelinePx = collapseGaps ? (singleLane ? 1950 : 1600) : 2200;
  const baseTimelineWidth = Math.min(120000, Math.max(minTimelinePx, Math.round(displaySpanHours * pxPerHour)));
  const timelineWidth = Math.min(GANTT_MAX_TIMELINE_WIDTH_PX, Math.max(minTimelinePx, Math.round(baseTimelineWidth * zoomScale)));
  const baseCompactedTs = useMemo(() => compactTs(displayMinTs), [compactTs, displayMinTs]);
  const pxPerMs = useMemo(() => timelineWidth / displaySpanMs, [timelineWidth, displaySpanMs]);

  const getX = useCallback((ts) => {
    const realTs = typeof ts === 'number' ? ts : Date.parse(String(ts));
    const normalizedTs = Number.isFinite(realTs) ? realTs : displayMinTs;
    return timelinePadLeft + (compactTs(normalizedTs) - baseCompactedTs) * pxPerMs;
  }, [compactTs, displayMinTs, baseCompactedTs, pxPerMs]);

  const laneToPositionedBars = useMemo(() => buildGanttPositionedBars({
    lanes,
    laneToSegments,
    compactTs,
    displayMinTs,
    displayMaxTs,
    baseCompactedTs,
    pxPerMs,
    timelinePadLeft,
  }), [lanes, laneToSegments, compactTs, displayMinTs, displayMaxTs, baseCompactedTs, pxPerMs]);

  const timelineSvgWidth = useMemo(() => {
    let maxRight = timelinePadLeft + timelineWidth + timelinePadRight;
    lanes.forEach((lane) => {
      const positionedBars = laneToPositionedBars[lane] || [];
      if (positionedBars.length > 0) {
        const last = positionedBars[positionedBars.length - 1];
        maxRight = Math.max(maxRight, last.x + last.w + timelinePadRight + 45);
      }
    });
    return maxRight;
  }, [lanes, laneToPositionedBars, timelineWidth]);

  const laneLabelWidth = expanded ? 210 : 132;
  const headerHeight = 50;
  const rowHeight = 34;
  const rowGap = 10;
  const rowSlotHeight = rowHeight + rowGap;
  const rowTopPadding = 8;
  const bodyChartHeight = rowTopPadding + lanes.length * rowSlotHeight + 10;
  const timelineViewportHeight = expanded
    ? Math.max(rowSlotHeight + 12, lanes.length * rowSlotHeight + 12)
    : (Math.max(1, Math.min(7, lanes.length)) * rowSlotHeight + 12);

  const ticks = useMemo(() => buildGanttTicks({
    timelineWidth,
    displaySpanHours,
    displayMinTs,
    displayMaxTs,
    collapseGaps,
    visibleSegments,
    getX,
  }), [timelineWidth, displaySpanHours, displayMinTs, displayMaxTs, collapseGaps, visibleSegments, getX]);

  const { startLaneIdx, endLaneIdx } = getGanttVisibleLaneWindow(scrollState, rowTopPadding, rowSlotHeight, lanes.length);
  const visibleLanes = lanes.slice(startLaneIdx, endLaneIdx + 1);
  const visibleTicks = ticks.filter((tick) => {
    const x = getX(tick);
    return x >= scrollState.left - 200 && x <= scrollState.left + scrollState.viewW + 200;
  });

  const onBodyScroll = (event) => {
    const { scrollLeft } = event.currentTarget;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = scrollLeft;

    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, left: scrollLeft }));
    });
  };

  const onVerticalScroll = (event) => {
    const { scrollTop } = event.currentTarget;
    if (scrollRequestRef.current) cancelAnimationFrame(scrollRequestRef.current);
    scrollRequestRef.current = requestAnimationFrame(() => {
      setScrollState((prev) => ({ ...prev, top: scrollTop }));
    });
  };

  const onDragStart = (event) => {
    if (!bodyScrollRef.current) return;
    dragRef.current = { active: true, startX: event.clientX, startScrollLeft: bodyScrollRef.current.scrollLeft };
  };

  const onDragMove = (event) => {
    if (!dragRef.current.active || !bodyScrollRef.current) return;
    bodyScrollRef.current.scrollLeft = dragRef.current.startScrollLeft - (event.clientX - dragRef.current.startX);
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;

    const onWheel = (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const zoomIn = event.deltaY < 0;
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, zoomScaleRef.current * (zoomIn ? 1.15 : 0.87))
      );
      if (Math.abs(nextZoom - zoomScaleRef.current) < 0.001) return;

      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const absoluteX = viewport.scrollLeft + anchorX;
      const time = displayMinTs + ((absoluteX - timelinePadLeft) / timelineWidth) * displaySpanMs;

      pendingZoomAnchorRef.current = { anchorX, time };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [timelineWidth, displaySpanMs, displayMinTs]);

  useLayoutEffect(() => {
    if (!pendingZoomAnchorRef.current || !bodyScrollRef.current) return;
    const { anchorX, time } = pendingZoomAnchorRef.current;
    const nextX = getX(time);
    bodyScrollRef.current.scrollLeft = nextX - anchorX;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale, getX]);

  const pickSegment = (segment) => {
    if (typeof onSelectSegment === 'function') onSelectSegment(segment);
  };

  const showTooltip = (event, segment, lane, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setHoveredSegment({
      x: Math.max(8, Math.min(x + 12, rect.width - 318)),
      y: Math.max(8, Math.min(y + 12, rect.height - 132)),
      lane,
      color,
      groupLabel: GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup,
      segmentType: segment.segmentType,
      start: segment.start,
      end: segment.end,
      durationSeconds: segment.durationSeconds,
    });
  };

  if (mapped.length === 0) return null;

  return (
    <div className="space-y-2 relative select-none" ref={containerRef}>
      {showGanttLegend && <GanttLegend items={legendItems} />}

      <div className="rounded-xl bg-slate-50/30 border border-slate-200 overflow-hidden shadow-sm">
        <GanttHeader
          laneLabelWidth={laneLabelWidth}
          headerScrollRef={headerScrollRef}
          timelineSvgWidth={timelineSvgWidth}
          headerHeight={headerHeight}
          visibleTicks={visibleTicks}
          getX={getX}
        />

        <div
          ref={verticalScrollRef}
          onScroll={onVerticalScroll}
          className="overflow-y-auto no-scrollbar"
          style={{ maxHeight: timelineViewportHeight }}
        >
          <div className="flex min-w-0" style={{ height: bodyChartHeight }}>
            <GanttLaneLabels
              visibleLanes={visibleLanes}
              lanes={lanes}
              laneLabelWidth={laneLabelWidth}
              rowTopPadding={rowTopPadding}
              rowSlotHeight={rowSlotHeight}
              rowHeight={rowHeight}
            />

            <div
              ref={bodyScrollRef}
              onScroll={onBodyScroll}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={() => { onDragEnd(); setHoveredSegment(null); }}
              className="flex-1 overflow-x-auto no-scrollbar cursor-default"
            >
              <GanttBarsSvg
                timelineSvgWidth={timelineSvgWidth}
                bodyChartHeight={bodyChartHeight}
                visibleTicks={visibleTicks}
                visibleLanes={visibleLanes}
                lanes={lanes}
                laneToPositionedBars={laneToPositionedBars}
                rowTopPadding={rowTopPadding}
                rowSlotHeight={rowSlotHeight}
                rowHeight={rowHeight}
                scrollState={scrollState}
                showStarMarkers={showStarMarkers}
                getX={getX}
                onPickSegment={pickSegment}
                onShowTooltip={showTooltip}
                onHideTooltip={() => setHoveredSegment(null)}
              />
            </div>
          </div>
        </div>
      </div>

      <GanttTooltip hoveredSegment={hoveredSegment} containerRef={containerRef} />
    </div>
  );
};


// --- features/charts/DurationBarChart.jsx ---




const DurationBarChart = React.memo(({ rows, maxVisibleRows = 0 }) => {
  const maxValue = rows.reduce((max, row) => Math.max(max, safeNumber(row.value)), 0) || 1;
  const rowSlotHeight = 66;
  const useScroll = maxVisibleRows > 0 && rows.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;
  return (
    <div className={`space-y-3 ${useScroll ? 'overflow-y-auto no-scrollbar pr-1' : ''}`} style={wrapperStyle}>
      {rows.map((row, idx) => {
        const rawValue = safeNumber(row.value);
        const rowMin = Number.isFinite(Number(row.minValue)) ? safeNumber(row.minValue) : null;
        const rowMax = Number.isFinite(Number(row.maxValue)) ? safeNumber(row.maxValue) : null;
        const hasRangeScale = rowMin !== null && rowMax !== null && rowMax >= rowMin;
        let width = rawValue <= 0 ? 0 : clampPercent(Math.max((rawValue / maxValue) * 100, 2));
        if (hasRangeScale) {
          const range = Math.max(0, rowMax - rowMin);
          if (range === 0) {
            width = rawValue > 0 ? 100 : 0;
          } else {
            const ratio = (rawValue - rowMin) / range;
            width = clampPercent(Math.max(2, ratio * 100));
          }
        }
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        return (
          <div key={row.id || row.label} className="py-2">
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="font-medium text-slate-700 truncate">{row.label}</div>
              <div className="text-slate-500 whitespace-nowrap">{row.valueLabel}</div>
            </div>
            <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }}></div>
            </div>
            {row.meta ? <div className="mt-1 text-xs text-slate-500">{row.meta}</div> : null}
          </div>
        );
      })}
    </div>
  );
});


// --- features/charts/SystemProcessingTrendChart.jsx ---



const SystemProcessingTrendChart = ({ rows }) => {
  if (!rows || rows.length === 0) return null;

  const width = 760;
  const height = 280;
  const margin = { top: 20, right: 20, bottom: 52, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const maxSeriesSeconds = rows.reduce((max, row) => Math.max(max, safeNumber(row.p90Seconds), safeNumber(row.avgSeconds)), 0) || 1;
  const maxSeconds = Math.max(maxSeriesSeconds, 1);
  const xStep = rows.length > 1 ? innerWidth / (rows.length - 1) : innerWidth / 2;
  const y = (seconds) => margin.top + (1 - (safeNumber(seconds) / maxSeconds)) * innerHeight;
  const x = (idx) => margin.left + (rows.length > 1 ? idx * xStep : innerWidth / 2);
  const avgPoints = rows.map((row, idx) => `${x(idx)},${y(row.avgSeconds)}`).join(' ');
  const p90Points = rows.map((row, idx) => `${x(idx)},${y(row.p90Seconds)}`).join(' ');
  const xLabelStep = rows.length > 10 ? Math.ceil(rows.length / 6) : 1;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl border border-slate-100 bg-white block">
        {yTicks.map((tick) => {
          const lineY = margin.top + (1 - tick) * innerHeight;
          return (
            <g key={`tick-${tick}`}>
              <line x1={margin.left} x2={width - margin.right} y1={lineY} y2={lineY} stroke="#E2E8F0" strokeDasharray={tick === 0 ? '0' : '3 3'} />
              <text x={margin.left - 8} y={lineY + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                {formatDuration(maxSeconds * tick)}
              </text>
            </g>
          );
        })}

        <polyline points={p90Points} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={avgPoints} fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {rows.map((row, idx) => (
          <g key={row.id || row.dateLabel}>
            <circle cx={x(idx)} cy={y(row.p90Seconds)} r="3.2" fill="#2563EB">
              <title>{`${row.dateLabel} | Slow-case ${formatDuration(row.p90Seconds)} | Average ${formatDuration(row.avgSeconds)} | ${row.docCount} docs`}</title>
            </circle>
            <circle cx={x(idx)} cy={y(row.avgSeconds)} r="3.2" fill="#06B6D4">
              <title>{`${row.dateLabel} | Slow-case ${formatDuration(row.p90Seconds)} | Average ${formatDuration(row.avgSeconds)} | ${row.docCount} docs`}</title>
            </circle>
            {idx % xLabelStep === 0 || idx === rows.length - 1 ? (
              <text x={x(idx)} y={height - 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {row.dateLabel}
              </text>
            ) : null}
          </g>
        ))}

        <text x={width / 2} y={height - 2} textAnchor="middle" className="fill-slate-500 text-[11px]">Date</text>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>Average Time</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]"></span>Slow-Case Time (Worst 10%)</span>
      </div>
    </div>
  );
};


// --- features/charts/SystemParetoChart.jsx ---



const SystemParetoChart = ({ rows, maxBars = 8 }) => {
  if (!rows || rows.length === 0) return null;

  const bars = rows.slice(0, Math.max(1, maxBars));
  const totalSeconds = bars.reduce((sum, row) => sum + safeNumber(row.totalSeconds), 0) || 1;
  const maxSeconds = bars.reduce((max, row) => Math.max(max, safeNumber(row.totalSeconds)), 0) || 1;
  const width = 760;
  const height = 320;
  const margin = { top: 20, right: 52, bottom: 78, left: 56 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const step = innerWidth / bars.length;
  const barWidth = Math.min(58, step * 0.62);
  const yLeft = (seconds) => margin.top + (1 - (safeNumber(seconds) / maxSeconds)) * innerHeight;
  const yRight = (ratio) => margin.top + (1 - Math.max(0, Math.min(1, safeNumber(ratio)))) * innerHeight;

  let cumulative = 0;
  const prepared = bars.map((row, idx) => {
    const seconds = safeNumber(row.totalSeconds);
    cumulative += seconds;
    return {
      ...row,
      idx,
      seconds,
      cumulativeShare: cumulative / totalSeconds,
      x: margin.left + idx * step + (step / 2),
      barX: margin.left + idx * step + (step - barWidth) / 2,
    };
  });
  const linePoints = prepared.map((row) => `${row.x},${yRight(row.cumulativeShare)}`).join(' ');
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="mt-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl border border-slate-100 bg-white block">
        {yTicks.map((tick) => {
          const lineY = margin.top + (1 - tick) * innerHeight;
          return (
            <g key={`pareto-tick-${tick}`}>
              <line
                x1={margin.left}
                x2={width - margin.right}
                y1={lineY}
                y2={lineY}
                stroke="#E2E8F0"
                strokeDasharray={tick === 0 ? '0' : '3 3'}
              />
              <text x={margin.left - 8} y={lineY + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
                {formatDuration(maxSeconds * tick)}
              </text>
              <text x={width - margin.right + 8} y={lineY + 4} textAnchor="start" className="fill-slate-500 text-[10px]">
                {`${Math.round(tick * 100)}%`}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={yRight(0.8)}
          y2={yRight(0.8)}
          stroke="#F59E0B"
          strokeWidth="1.4"
          strokeDasharray="4 4"
        />
        <text x={width - margin.right} y={yRight(0.8) - 6} textAnchor="end" className="fill-amber-600 text-[10px] font-semibold">
          80% Focus Line
        </text>

        {prepared.map((row) => (
          <rect
            key={`${row.id || row.documentLabel}-bar`}
            x={row.barX}
            y={yLeft(row.seconds)}
            width={barWidth}
            height={Math.max(2, margin.top + innerHeight - yLeft(row.seconds))}
            rx="4"
            fill="#2563EB"
          >
            <title>{`${row.documentLabel} | ${formatDuration(row.seconds)} (${formatPercent(row.seconds / totalSeconds)})`}</title>
          </rect>
        ))}

        <polyline points={linePoints} fill="none" stroke="#0EA5E9" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {prepared.map((row) => (
          <g key={`${row.id || row.documentLabel}-point`}>
            <circle cx={row.x} cy={yRight(row.cumulativeShare)} r="3.2" fill="#0EA5E9">
              <title>{`${row.documentLabel} | Cumulative ${formatPercent(row.cumulativeShare)}`}</title>
            </circle>
            <text x={row.x} y={height - 20} textAnchor="middle" className="fill-slate-500 text-[10px]">
              {`#${row.idx + 1}`}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]"></span>
          Document Delay
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          Cumulative Share
        </span>
      </div>
    </div>
  );
};


// --- features/charts/SystemBottleneckTable.jsx ---



const SystemBottleneckTable = ({ rows, maxVisibleRows = 6 }) => {
  if (!rows || rows.length === 0) return null;
  const slotHeight = 70;
  const useScroll = maxVisibleRows > 0 && rows.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * slotHeight}px` } : undefined;
  const maxTotal = rows.reduce((max, row) => Math.max(max, safeNumber(row.totalSeconds)), 0) || 1;

  return (
    <div className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-1' : ''}`} style={wrapperStyle}>
      <div className="space-y-2">
        {rows.map((row, idx) => {
          const share = clampPercent((safeNumber(row.totalSeconds) / maxTotal) * 100);
          return (
            <div key={row.id || row.documentLabel} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800 truncate">{idx + 1}. {row.documentLabel}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    Processing {formatDuration(row.processingSeconds)} | Repeat {formatDuration(row.reprocessSeconds)} | Waiting {formatDuration(row.waitingSeconds)}
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">{formatDuration(row.totalSeconds)}</div>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.max(4, share)}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// --- features/charts/FlowDelayComparisonTable.jsx ---




const FlowDelayComparisonTable = ({ rows, maxVisibleRows = 0 }) => {
  const maxAvgSeconds = rows.reduce((max, row) => Math.max(max, safeNumber(row.avgSeconds)), 0) || 1;
  const rowSlotHeight = 78;
  const useScroll = maxVisibleRows > 0 && rows.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  return (
    <div className={`space-y-2.5 ${useScroll ? 'overflow-y-auto no-scrollbar pr-1' : ''}`} style={wrapperStyle}>
      {rows.map((row, idx) => {
        const avgSeconds = safeNumber(row.avgSeconds);
        const relative = avgSeconds <= 0 ? 0 : avgSeconds / maxAvgSeconds;
        const barWidth = avgSeconds <= 0 ? 0 : Math.max(4, Math.min(100, relative * 100));
        const color = CHART_PALETTE[idx % CHART_PALETTE.length];
        return (
          <div key={row.id || row.label} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                <div className="font-semibold text-slate-800 truncate">{row.label}</div>
              </div>
              <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                {formatDuration(avgSeconds)} avg
              </div>
            </div>
            <div className="mt-2.5 px-1">
              <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>Min</span>
                <span>Max</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: color }}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


// --- features/charts/DonutWorkloadChart.jsx ---




// D3 is loaded via a global script tag in index.html to avoid ESM import issues with Babel Standalone.
const d3 = window.d3;

/**
 * Advanced Workload Share Visualization
 * Features:
 * - Fluid arc transitions (morphing)
 * - Physics-based hover (exploding segments)
 * - Details-on-demand tooltip
 * - Interactive legend with cross-highlighting
 */
const DonutWorkloadChart = React.memo(({ rows, expanded = false }) => {
  const svgRef = useRef(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [hoverSource, setHoverSource] = useState(null); // 'chart' | 'legend' | null
  
  const size = expanded ? 480 : 260;
  const radius = Math.min(size, size) / 2;
  const innerRadius = radius * (expanded ? 0.65 : 0.6);
  const outerRadius = radius * 0.9;
  const hoverOuterRadius = radius * 0.95;

  const data = useMemo(() => {
    return rows
      .map((row, idx) => ({
        user: row.user || `User ${idx + 1}`,
        value: safeNumber(row.totalSeconds),
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      }))
      .filter(d => d.value > 0);
  }, [rows]);

  const totalValue = useMemo(() => d3.sum(data, d => d.value), [data]);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('g.chart-group');
    
    const pie = d3.pie()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.02);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .cornerRadius(8);

    const pieData = pie(data);

    // Join data
    const paths = g.selectAll('path.arc-segment')
      .data(pieData, d => d.data.user);

    // Remove old
    paths.exit()
      .transition()
      .duration(500)
      .attrTween('d', function(d) {
        const i = d3.interpolate(d.endAngle, d.startAngle);
        return t => {
          d.endAngle = i(t);
          return arc(d);
        };
      })
      .remove();

    // Enter new
    const pathsEnter = paths.enter()
      .append('path')
      .attr('class', 'arc-segment')
      .attr('fill', d => d.data.color)
      .attr('cursor', 'pointer')
      .each(function(d) { this._current = { ...d, endAngle: d.startAngle }; });

    // Update + Enter
    pathsEnter.merge(paths)
      .on('mouseenter', (event, d) => {
        setHoveredUser(d.data.user);
        setHoverSource('chart');
      })
      .on('mouseleave', () => {
        setHoveredUser(null);
        setHoverSource(null);
      })
      .transition()
      .duration(750)
      .ease(d3.easeElasticOut.amplitude(1).period(0.6))
      .attrTween('d', function(d) {
        const i = d3.interpolate(this._current, d);
        this._current = i(0);
        return t => {
          const currentArc = i(t);
          const isHovered = hoveredUser === d.data.user;
          arc.outerRadius(isHovered ? hoverOuterRadius : outerRadius);
          return arc(currentArc);
        };
      })
      .attr('opacity', d => (hoveredUser && hoveredUser !== d.data.user ? 0.4 : 1))
      .attr('fill', d => d.data.color);

  }, [data, hoveredUser, innerRadius, outerRadius, hoverOuterRadius]);

  if (data.length === 0) return null;

  const activeSegment = hoveredUser ? data.find(d => d.user === hoveredUser) : null;

  // Logic to determine which items to show in the legend
  const legendItems = (hoverSource === 'chart' && hoveredUser) 
    ? data.filter(d => d.user === hoveredUser) 
    : data;

  // Stable 6-user view height for the legend (approx 44.5px per row)
  const maxLegendRows = 6;
  const legendRowHeight = 44.5; 
  const legendMaxHeight = maxLegendRows * legendRowHeight;
  
  const legendWrapperStyle = !expanded 
    ? { maxHeight: `${legendMaxHeight}px` } 
    : undefined;

  return (
    <div className={`mt-2 grid grid-cols-1 ${expanded ? 'xl:grid-cols-[1fr_300px] gap-12' : 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-8'} items-start`}>
      {/* SVG Visualization Container */}
      <div className="relative flex justify-center items-center group min-w-0 py-4">
        <svg 
          ref={svgRef} 
          width={size} 
          height={size} 
          viewBox={`0 0 ${size} ${size}`}
          className="drop-shadow-2xl overflow-visible max-w-full h-auto"
        >
          <g className="chart-group" transform={`translate(${size / 2}, ${size / 2})`}></g>
          
          {/* Central Context Label */}
          <g transform={`translate(${size / 2}, ${size / 2})`}>
            <text textAnchor="middle" className="fill-slate-900 font-bold tracking-tight" style={{ fontSize: expanded ? '32px' : '22px' }}>
              <tspan x="0" dy="0.1em">{activeSegment ? formatDuration(activeSegment.value) : formatDuration(totalValue)}</tspan>
            </text>
            {activeSegment ? (
              <text textAnchor="middle" className="fill-[#2563EB] font-bold" style={{ fontSize: expanded ? '18px' : '15px' }}>
                <tspan x="0" dy="1.6em">{formatPercent(activeSegment.value / totalValue)}</tspan>
              </text>
            ) : (
              <text textAnchor="middle" className="fill-slate-400 font-bold" style={{ fontSize: expanded ? '14px' : '11px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                <tspan x="0" dy="1.8em">Total</tspan>
              </text>
            )}
          </g>
        </svg>
      </div>

      {/* Interactive Legend (Dual-Mode Focus) */}
      <div 
        className={`flex flex-col gap-1.5 py-4 ${expanded ? 'max-h-[500px] overflow-y-auto pr-2 custom-scrollbar' : 'overflow-y-auto pr-1 no-scrollbar'}`}
        style={legendWrapperStyle}
      >
        {legendItems.map((d) => {
          const isFaded = hoverSource === 'legend' && hoveredUser && d.user !== hoveredUser;
          
          return (
            <div 
              key={d.user}
              onMouseEnter={() => {
                setHoveredUser(d.user);
                setHoverSource('legend');
              }}
              onMouseLeave={() => {
                setHoveredUser(null);
                setHoverSource(null);
              }}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 cursor-default border
                ${hoveredUser === d.user ? 'bg-[#EFF6FF] border-[#BFDBFE] shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-50'}
                ${isFaded ? 'opacity-20 pointer-events-none' : 'opacity-100'}
              `}
            >
              <div 
                className="w-2.5 h-2.5 rounded-full shrink-0" 
                style={{ backgroundColor: d.color, boxShadow: hoveredUser === d.user ? `0 0 10px ${d.color}` : 'none' }}
              />
              <span className={`text-sm font-medium truncate flex-1 ${hoveredUser === d.user ? 'text-[#1D4ED8]' : 'text-slate-500'}`}>
                {d.user}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
});


// --- features/charts/UserContributionStackChart.jsx ---



/**
 * Top User Work Mix (Restored Original Styles with Interactive Tooltips)
 */
const UserContributionStackChart = React.memo(({ rows = [], expanded = false }) => {
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, user: '', type: '', duration: '', percent: '', color: '' });
  const [hoveredUser, setHoveredUser] = useState(null);
  const [hoveredType, setHoveredType] = useState(null); // 'review' | 'edit' | null
  const containerRef = React.useRef(null);

  const prepared = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const review = safeNumber(row.reviewSeconds);
        const edit = safeNumber(row.editSeconds);
        const total = review + edit;
        return {
          user: row.user || 'Unknown User',
          review,
          edit,
          total,
          reworkRate: safeNumber(row.reworkRate),
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const maxTotal = useMemo(() => {
    if (prepared.length === 0) return 1;
    return Math.max(...prepared.map(d => d.total), 1);
  }, [prepared]);

  if (prepared.length === 0) return null;

  const maxVisibleRows = 4;
  const rowSlotHeight = 63.5; 
  const useScroll = prepared.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  const handleMouseMove = (e, user, type, duration, percent, color) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      user,
      type,
      duration,
      percent,
      color
    });
  };

  return (
    <div className="space-y-4 relative" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600 mb-1">
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4]"></span>
          Review
        </div>
        <div className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
          Edit
        </div>
      </div>

      <div 
        className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-2' : ''} space-y-1`} 
        style={wrapperStyle}
      >
        {prepared.map((row) => {
          const currentMax = maxTotal || 1;
          const totalWidth = clampPercent(Math.max((row.total / currentMax) * 100, 12));
          const reviewWidth = row.total > 0 ? clampPercent((row.review / row.total) * 100) : 0;
          const editWidth = row.total > 0 ? clampPercent((row.edit / row.total) * 100) : 0;
          const isUserDimmed = hoveredUser && hoveredUser !== row.user;

          return (
            <div 
              key={row.user} 
              className={`py-2.5 transition-all duration-300 group border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-xl px-2 -mx-2 ${isUserDimmed ? 'opacity-30 grayscale-[0.3]' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-[#17335f] truncate">{row.user}</span>
                <span className="text-[11px] font-bold text-slate-400">{formatDuration(row.total)}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100/80 overflow-hidden shadow-inner">
                <div className="h-full rounded-full overflow-hidden flex shadow-sm" style={{ width: `${totalWidth}%` }}>
                  <div 
                    onMouseEnter={(e) => {
                      handleMouseMove(e, row.user, 'Review', formatDuration(row.review), formatPercent(row.review / (row.total || 1)), '#06B6D4');
                      setHoveredUser(row.user);
                      setHoveredType('review');
                    }}
                    onMouseMove={(e) => handleMouseMove(e, row.user, 'Review', formatDuration(row.review), formatPercent(row.review / (row.total || 1)), '#06B6D4')}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, show: false }));
                      setHoveredUser(null);
                      setHoveredType(null);
                    }}
                    className={`h-full bg-[#06B6D4] cursor-pointer transition-all duration-300 hover:brightness-110 ${hoveredUser === row.user && hoveredType === 'edit' ? 'opacity-20' : 'opacity-100'}`} 
                    style={{ width: `${reviewWidth}%` }}
                  />
                  <div 
                    onMouseEnter={(e) => {
                      handleMouseMove(e, row.user, 'Edit', formatDuration(row.edit), formatPercent(row.edit / (row.total || 1)), '#F59E0B');
                      setHoveredUser(row.user);
                      setHoveredType('edit');
                    }}
                    onMouseMove={(e) => handleMouseMove(e, row.user, 'Edit', formatDuration(row.edit), formatPercent(row.edit / (row.total || 1)), '#F59E0B')}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, show: false }));
                      setHoveredUser(null);
                      setHoveredType(null);
                    }}
                    className={`h-full bg-[#F59E0B] cursor-pointer transition-all duration-300 hover:brightness-110 ${hoveredUser === row.user && hoveredType === 'review' ? 'opacity-20' : 'opacity-100'}`} 
                    style={{ width: `${editWidth}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern Tooltip matching Timeline/Matrix */}
      {tooltip.show && (
        <div 
          className="absolute pointer-events-none z-[200] w-[210px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-3.5 shadow-ktb animate-in fade-in zoom-in duration-150"
          style={{ 
            left: Math.max(0, Math.min(tooltip.x + 12, (containerRef.current?.clientWidth || 0) - 220)), 
            top: tooltip.y - 12,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ 
                backgroundColor: tooltip.color,
                boxShadow: `0 0 10px ${tooltip.color}66`
              }}
            />
            <div className="text-[13px] font-bold text-[#17335f] uppercase tracking-tight truncate">
              {tooltip.user}
            </div>
          </div>
          <div className="space-y-1.5 text-[11px] font-semibold text-slate-500">
            <div className="flex justify-between items-center pb-1 border-b border-slate-50">
              <span className="uppercase tracking-wider">Type</span>
              <span className="text-[#17335f] text-[12px]">{tooltip.type}</span>
            </div>
            <div className="flex justify-between items-center pb-1 border-b border-slate-50">
              <span className="uppercase tracking-wider">Duration</span>
              <span className="text-[#00a4e4] text-[13px] font-bold">{tooltip.duration}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase tracking-wider">Portion</span>
              <span className="text-slate-600 font-medium">{tooltip.percent}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});


// --- features/charts/ReworkMatrixScatterChart.jsx ---





const VIBRANT_PALETTE = ['#F43F5E', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#D946EF', '#84CC16', '#F97316'];

const ReworkMatrixScatterChart = React.memo(({ 
  rows = [], 
  expanded = false, 
  showQuadrants = false 
}) => {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, y: 0, view: null });
  const panFrameRef = useRef(null);
  const pendingViewRef = useRef(null);
  const [hoveredUser, setHoveredUser] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const sourceRows = Array.isArray(rows) ? rows : [];

  const prepared = useMemo(() => sourceRows
      .slice(0, 8)
      .map((row, idx) => ({
        user: row.user || `User ${idx + 1}`,
        avgTimePerDocSeconds: safeNumber(row.avgTimePerDocSeconds),
        reworkRate: Math.max(0, Math.min(1, safeNumber(row.reworkRate))),
        autoClosedRate: Math.max(0, Math.min(1, safeNumber(row.autoClosedRate))),
        totalActiveSeconds: safeNumber(row.totalActiveSeconds),
        color: VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length],
      }))
      .filter((row) => row.avgTimePerDocSeconds > 0 || row.reworkRate > 0 || row.totalActiveSeconds > 0),
    [sourceRows]
  );

  const maxX = prepared.reduce((max, row) => Math.max(max, row.avgTimePerDocSeconds), 0) || 1;
  const xDomainMax = Math.max(1, maxX * 1.08);
  const maxY = prepared.reduce((max, row) => Math.max(max, row.reworkRate), 0) || 0;
  const yDomainMax = Math.max(0.05, maxY * 1.1);
  const [view, setView] = useState({ xMin: 0, xMax: xDomainMax, yMin: 0, yMax: yDomainMax });

  useEffect(() => {
    setView({ xMin: 0, xMax: xDomainMax, yMin: 0, yMax: yDomainMax });
  }, [xDomainMax, yDomainMax, expanded]);

  const minActive = prepared.reduce(
    (min, row) => Math.min(min, row.totalActiveSeconds),
    prepared[0]?.totalActiveSeconds || 0
  );
  const maxActive = prepared.reduce((max, row) => Math.max(max, row.totalActiveSeconds), 0) || 1;
  const activeRange = Math.max(0, maxActive - minActive);

  const width = expanded ? 820 : 620;
  const height = expanded ? 420 : 350;
  const maxBubbleRadius = expanded ? 26 : 20;

  const margin = expanded
    ? { top: 30, right: 34, bottom: 58, left: 66 }
    : { top: 24, right: 24, bottom: 48, left: 56 };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const clampView = (nextView) => {
    const minXSpan = xDomainMax / 8;
    const minYSpan = yDomainMax / 8;
    const xSpan = Math.min(xDomainMax, Math.max(minXSpan, nextView.xMax - nextView.xMin));
    const ySpan = Math.min(yDomainMax, Math.max(minYSpan, nextView.yMax - nextView.yMin));

    let xMin = nextView.xMin;
    let yMin = nextView.yMin;
    if (xMin < 0) xMin = 0;
    if (xMin + xSpan > xDomainMax) xMin = xDomainMax - xSpan;
    if (yMin < 0) yMin = 0;
    if (yMin + ySpan > yDomainMax) yMin = yDomainMax - ySpan;

    return { xMin, xMax: xMin + xSpan, yMin, yMax: yMin + ySpan };
  };

  const normalizedView = clampView(view.xMax <= xDomainMax && view.yMax <= yDomainMax ? view : { xMin: 0, xMax: xDomainMax, yMin: 0, yMax: yDomainMax });
  const xSpan = normalizedView.xMax - normalizedView.xMin;
  const ySpan = normalizedView.yMax - normalizedView.yMin;
  const isZoomed = xSpan < xDomainMax - 0.001 || ySpan < yDomainMax - 0.0001;
  const x = (v) => margin.left + ((safeNumber(v) - normalizedView.xMin) / xSpan) * innerWidth;
  const y = (v) => margin.top + ((normalizedView.yMax - Math.max(0, Math.min(yDomainMax, safeNumber(v)))) / ySpan) * innerHeight;
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => normalizedView.xMin + xSpan * tick);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((tick) => normalizedView.yMin + ySpan * tick);

  const bubbleRadius = (active) => {
    const minRadius = expanded ? 6 : 5;
    const maxRadius = maxBubbleRadius;
    if (activeRange <= 0) return (minRadius + maxRadius) / 2;

    const normalized = (Math.max(0, active) - minActive) / activeRange;
    return minRadius + Math.max(0, Math.min(1, normalized)) * (maxRadius - minRadius);
  };

  const zoomAt = (scaleFactor, anchorX = 0.5, anchorY = 0.5) => {
    const current = clampView(view);
    const currentXSpan = current.xMax - current.xMin;
    const currentYSpan = current.yMax - current.yMin;
    const nextXSpan = currentXSpan / scaleFactor;
    const nextYSpan = currentYSpan / scaleFactor;
    const xAnchor = current.xMin + currentXSpan * anchorX;
    const yAnchor = current.yMax - currentYSpan * anchorY;

    setView(clampView({
      xMin: xAnchor - nextXSpan * anchorX,
      xMax: xAnchor + nextXSpan * (1 - anchorX),
      yMin: yAnchor - nextYSpan * (1 - anchorY),
      yMax: yAnchor + nextYSpan * anchorY,
    }));
  };

  const getSvgPoint = (event) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  };

  const onWheel = (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
      const point = getSvgPoint(event);
      if (!point) return;
      const anchorX = Math.max(0, Math.min(1, (point.x - margin.left) / innerWidth));
      const anchorY = Math.max(0, Math.min(1, (point.y - margin.top) / innerHeight));
      zoomAt(event.deltaY < 0 ? 1.18 : 0.85, anchorX, anchorY);
      return;
    }

    if (!isZoomed) return;

    event.preventDefault();
    const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
    const current = clampView(view);
    const currentXSpan = current.xMax - current.xMin;
    const currentYSpan = current.yMax - current.yMin;
    const xShift = (event.deltaX * deltaUnit / innerWidth) * currentXSpan;
    const yShift = -(event.deltaY * deltaUnit / innerHeight) * currentYSpan;

    setView(clampView({
      xMin: current.xMin + xShift,
      xMax: current.xMax + xShift,
      yMin: current.yMin + yShift,
      yMax: current.yMax + yShift,
    }));
  };

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const onPointerDown = (event) => {
    if (!isZoomed) return;
    const point = getSvgPoint(event);
    if (!point) return;
    dragRef.current = { active: true, x: point.x, y: point.y, view: normalizedView };
  };

  const updateTooltipPos = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTooltipPos({
      x: Math.max(8, Math.min(x + 12, rect.width - 270)),
      y: Math.max(8, Math.min(y + 12, rect.height - 150))
    });
  };

  const onPointerMove = (event) => {
    if (!dragRef.current.active) return;
    const point = getSvgPoint(event);
    if (!point) return;
    const { x: startX, y: startY, view: startView } = dragRef.current;
    const nextXShift = -((point.x - startX) / innerWidth) * (startView.xMax - startView.xMin);
    const nextYShift = ((point.y - startY) / innerHeight) * (startView.yMax - startView.yMin);
    pendingViewRef.current = clampView({
      xMin: startView.xMin + nextXShift,
      xMax: startView.xMax + nextXShift,
      yMin: startView.yMin + nextYShift,
      yMax: startView.yMax + nextYShift,
    });

    if (panFrameRef.current) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      if (pendingViewRef.current) setView(pendingViewRef.current);
    });
  };

  const onPointerUp = (event) => {
    dragRef.current.active = false;
  };

  const onPointerLeave = () => {
    dragRef.current.active = false;
    setHoveredUser(null);
  };

  const clipId = `quality-edit-plot-${expanded ? 'expanded' : 'compact'}`;

  if (prepared.length === 0) return null;

  const hoveredData = hoveredUser ? prepared.find(p => p.user === hoveredUser) : null;
  const occupiedLabelBoxes = [];
  const getPointLabelPosition = (row, pointX, pointY, pointRadius, shortLabel) => {
    const labelWidth = Math.max(46, shortLabel.length * 6.8);
    const labelHeight = 14;
    const candidates = [
      { x: pointX, y: pointY - pointRadius - 9, anchor: 'middle' },
      { x: pointX, y: pointY + pointRadius + 17, anchor: 'middle' },
      { x: pointX + pointRadius + 9, y: pointY + 4, anchor: 'start' },
      { x: pointX - pointRadius - 9, y: pointY + 4, anchor: 'end' },
    ];

    const boundsFor = (candidate) => {
      const left = candidate.anchor === 'middle'
        ? candidate.x - labelWidth / 2
        : candidate.anchor === 'end'
          ? candidate.x - labelWidth
          : candidate.x;
      return {
        left,
        right: left + labelWidth,
        top: candidate.y - labelHeight,
        bottom: candidate.y + 3,
      };
    };

    const overlaps = (box) => occupiedLabelBoxes.some((used) => (
      box.left < used.right + 3
      && box.right > used.left - 3
      && box.top < used.bottom + 2
      && box.bottom > used.top - 2
    ));

    const inPlot = (box) => (
      box.left >= margin.left + 2
      && box.right <= width - margin.right - 2
      && box.top >= margin.top + 2
      && box.bottom <= height - margin.bottom - 2
    );

    const selected = candidates.find((candidate) => {
      const box = boundsFor(candidate);
      return inPlot(box) && !overlaps(box);
    }) || candidates.find((candidate) => inPlot(boundsFor(candidate))) || candidates[0];

    const selectedBox = boundsFor(selected);
    occupiedLabelBoxes.push(selectedBox);
    return selected;
  };

  return (
    <div className={`mt-1 overflow-hidden relative group ${expanded ? 'w-full max-w-[900px] mx-auto px-1' : ''}`} ref={containerRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto bg-white block cursor-default"
        style={{ overflow: 'hidden', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={margin.left - maxBubbleRadius}
              y={margin.top - maxBubbleRadius}
              width={innerWidth + maxBubbleRadius * 2}
              height={innerHeight + maxBubbleRadius * 2}
            />
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Quadrant Background Colors */}
        {showQuadrants && !isZoomed && (
          <g opacity="0.05" className="pointer-events-none">
            <rect x={margin.left} y={margin.top} width={innerWidth / 2} height={innerHeight / 2} fill="#F59E0B" />
            <rect x={margin.left + innerWidth / 2} y={margin.top} width={innerWidth / 2} height={innerHeight / 2} fill="#EF4444" />
            <rect x={margin.left} y={margin.top + innerHeight / 2} width={innerWidth / 2} height={innerHeight / 2} fill="#10B981" />
            <rect x={margin.left + innerWidth / 2} y={margin.top + innerHeight / 2} width={innerWidth / 2} height={innerHeight / 2} fill="#3B82F6" />
          </g>
        )}

        {/* Grid Lines */}
        {yTicks.map((tick) => (
          <line
            key={`h-${tick}`}
            className="pointer-events-none"
            x1={margin.left}
            x2={width - margin.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick <= 0.001 ? '#CBD5E1' : '#F1F5F9'}
            strokeWidth={tick <= 0.001 ? '1.5' : '1'}
            strokeDasharray={tick <= 0.001 ? '0' : '3 3'}
          />
        ))}
        {xTicks.map((tick) => (
          <line
            key={`v-${tick}`}
            className="pointer-events-none"
            y1={margin.top}
            y2={height - margin.bottom}
            x1={x(tick)}
            x2={x(tick)}
            stroke={tick <= 0.001 ? '#CBD5E1' : '#F1F5F9'}
            strokeWidth={tick <= 0.001 ? '1.5' : '1'}
            strokeDasharray={tick <= 0.001 ? '0' : '3 3'}
          />
        ))}

        {/* Hover Crosshairs */}
        {hoveredData && (
          <g className="pointer-events-none transition-opacity duration-300">
            <line 
              x1={margin.left} x2={x(hoveredData.avgTimePerDocSeconds)} 
              y1={y(hoveredData.reworkRate)} y2={y(hoveredData.reworkRate)} 
              stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" 
            />
            <line 
              x1={x(hoveredData.avgTimePerDocSeconds)} x2={x(hoveredData.avgTimePerDocSeconds)} 
              y1={y(hoveredData.reworkRate)} y2={height - margin.bottom} 
              stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 4" 
            />
          </g>
        )}

        {/* Quadrant Text Labels */}
        {showQuadrants && !isZoomed && (
          <g className="pointer-events-none select-none" opacity="0.85">
            <text x={margin.left + 14} y={margin.top + 28} className="fill-amber-600/70 text-[12px] font-black italic uppercase">FAST ITERATION</text>
            <text x={width - margin.right - 14} y={margin.top + 28} textAnchor="end" className="fill-red-600/70 text-[12px] font-black italic uppercase">HIGH COMPLEXITY</text>
            <text x={margin.left + 14} y={height - margin.bottom - 12} className="fill-emerald-600/70 text-[12px] font-black italic uppercase">PRECISION SPEED</text>
            <text x={width - margin.right - 14} y={height - margin.bottom - 12} textAnchor="end" className="fill-[#2563EB] opacity-70 text-[12px] font-black italic uppercase">CAREFUL ANALYSIS</text>
          </g>
        )}

        {/* Axis Ticks */}
        {yTicks.map((tick) => (
          <text key={`yt-${tick}`} x={margin.left - 14} y={y(tick) + 5} textAnchor="end" className="fill-black text-[13px] font-medium pointer-events-none">
            {Math.round(tick * 1000) / 10}%
          </text>
        ))}
        {xTicks.map((tick) => (
          <text key={`xt-${tick}`} x={x(tick)} y={height - margin.bottom + 22} textAnchor="middle" className="fill-black text-[13px] font-medium pointer-events-none">
            {formatDuration(tick)}
          </text>
        ))}

        <g clipPath={`url(#${clipId})`}>
          {prepared.map((row, idx) => {
            const px = x(row.avgTimePerDocSeconds);
            const py = y(row.reworkRate);
            const pointRadius = bubbleRadius(row.totalActiveSeconds);
            const color = row.color;
            const shortUserLabel = row.user.length > 14 ? `${row.user.slice(0, 14)}...` : row.user;
            const isHovered = hoveredUser === row.user;
            
            if (px + pointRadius < margin.left - 10 || px - pointRadius > width - margin.right + 10 || py + pointRadius < margin.top - 10 || py - pointRadius > height - margin.bottom + 10) return null;

            const labelPosition = getPointLabelPosition(row, px, py, pointRadius, shortUserLabel);
            
            return (
              <g 
                key={row.user} 
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  setHoveredUser(row.user);
                  updateTooltipPos(e);
                }}
                onMouseMove={(e) => updateTooltipPos(e)}
                onMouseLeave={() => setHoveredUser(null)}
              >
                <circle 
                  cx={px} 
                  cy={py} 
                  r={mounted ? (isHovered ? pointRadius * 1.15 : pointRadius) : 0} 
                  fill={color} 
                  opacity={1} 
                  stroke="#ffffff" 
                  strokeWidth={isHovered ? 3 : 2}
                  filter={isHovered ? 'url(#glow)' : ''}
                  className="transition-all duration-300 ease-out shadow-sm"
                />
                <text 
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor={labelPosition.anchor}
                  className={`fill-black text-[12px] pointer-events-none transition-all duration-300 ${isHovered ? 'font-bold' : 'font-semibold'} ${mounted ? 'opacity-100' : 'opacity-0'}`}
                >
                  {shortUserLabel}
                </text>
              </g>
            );
          })}
        </g>

        <text x={margin.left + innerWidth / 2} y={height - 8} textAnchor="middle" className="fill-black text-[14px] font-bold uppercase tracking-wide pointer-events-none">
          Avg Time per Document
        </text>
        <text transform={`translate(12 ${margin.top + innerHeight / 2}) rotate(-90)`} textAnchor="middle" className="fill-black text-[14px] font-bold uppercase tracking-wide pointer-events-none">
          Edit Rate
        </text>
      </svg>

      {/* Modern Tooltip matching Timeline/WorkMix */}
      {hoveredData && (
        <div 
          className="absolute pointer-events-none z-[200] w-[260px] rounded-xl border border-[#d7e8f6] bg-white/95 backdrop-blur-md p-4 shadow-ktb animate-in fade-in zoom-in duration-150"
          style={{ 
            left: tooltipPos.x,
            top: tooltipPos.y,
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ 
                backgroundColor: hoveredData.color,
                boxShadow: `0 0 10px ${hoveredData.color}66`
              }}
            />
            <div className="text-[14px] font-bold text-[#17335f] uppercase tracking-tight truncate">
              {hoveredData.user}
            </div>
          </div>
          <div className="space-y-2 text-[12px] font-semibold text-slate-500">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
              <span className="uppercase tracking-wider">Avg Time</span>
              <span className="text-[#17335f] text-[13px]">{formatDuration(hoveredData.avgTimePerDocSeconds)}</span>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-50">
              <span className="uppercase tracking-wider">Edit Rate</span>
              <span className="text-[#00a4e4] text-[14px] font-bold">{formatPercent(hoveredData.reworkRate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="uppercase tracking-wider">Total Active</span>
              <span className="text-slate-600 font-medium">{formatDuration(hoveredData.totalActiveSeconds)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});


// --- features/charts/ProcessTimeBreakdownChart.jsx ---




const STACK_KEYS = [
  { key: 'vat', label: 'Value-Added', color: '#22C55E' },
  { key: 'wait', label: 'Waiting', color: '#F59E0B' },
  { key: 'rework', label: 'Rework', color: '#EF4444' },
  { key: 'handover', label: 'Handover', color: '#3B82F6' },
  { key: 'other', label: 'Other', color: '#94A3B8' },
];

function formatMinutes(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (safeSeconds < 60) return `${safeSeconds}s`;
  if (safeSeconds < 3600) return `${Math.round(safeSeconds / 60)}m`;
  if (safeSeconds < 86400) return `${Math.round(safeSeconds / 3600)}h`;
  if (safeSeconds < 2592000) return `${Math.round(safeSeconds / 86400)}d`;
  return `${Math.round(safeSeconds / 2592000)}mo`;
}

function normalizeChartData(data) {
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return [];

  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  if (hasStackShape) return rows.map((row, index) => ({
    ...row,
    name: row.name || row.label || `Step ${index + 1}`,
  }));

  return rows.map((row, index) => ({
    id: row.key || row.id || row.label || `segment_${index}`,
    name: row.label || row.name || `Segment ${index + 1}`,
    seconds: Number(row.seconds) || 0,
    color: row.color || '#94A3B8',
  }));
}

function getStackKeys(data) {
  const rows = Array.isArray(data) ? data : [];
  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  if (hasStackShape) return STACK_KEYS;

  return rows.map((row, index) => ({
    key: row.key || row.id || row.label || `segment_${index}`,
    label: row.label || row.name || `Segment ${index + 1}`,
    color: row.color || '#94A3B8',
  }));
}

function DurationBarLabel({ x, y, width, value, index, chartData }) {
  const row = chartData[index] || {};
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={Math.max(12, y - 8)}
      textAnchor="middle"
      fill={row.color || '#334155'}
      className="text-[11px] font-bold"
    >
      {formatDuration(value)}
    </text>
  );
}

const ProcessTimeBreakdownChart = ({ data, showLabels = true }) => {
  const rows = Array.isArray(data) ? data : [];
  const hasStackShape = rows.some((row) => STACK_KEYS.some(({ key }) => Number(row[key]) > 0));
  const chartData = React.useMemo(() => normalizeChartData(data), [data]);
  const stackKeys = React.useMemo(() => getStackKeys(data), [data]);
  
  return (
    <div className="h-full min-h-[300px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 34, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={formatMinutes} />
          <Tooltip formatter={(value) => formatDuration(value)} />
          {hasStackShape && <Legend />}
          {hasStackShape ? (
            stackKeys.map(({ key, label, color }) => (
              <Bar key={key} dataKey={key} stackId="process" fill={color} name={label} />
            ))
          ) : (
            <Bar dataKey="seconds" name="Duration" radius={[8, 8, 0, 0]}>
              {showLabels && <LabelList content={(props) => <DurationBarLabel {...props} chartData={chartData} />} />}
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


// --- features/data-management/DataManagementView.jsx ---




const DataManagementView = ({ sources, onUploadFiles, onDeleteSource, onConnectGSheet, onDisconnectGSheet, gsheetConnections, uploading, syncing }) => {
  const [itemToDelete, setItemToDelete] = useState(null);
  const fileInputRef = useRef(null);
  const [gsheetUrl, setGsheetUrl] = useState('');
  const [gsheetLoading, setGsheetLoading] = useState(false);
  const [gsheetError, setGsheetError] = useState('');
  const [gsheetSuccess, setGsheetSuccess] = useState('');

  const handleGSheetConnect = async () => {
    if (!gsheetUrl.trim()) return;
    setGsheetLoading(true);
    setGsheetError('');
    setGsheetSuccess('');
    try {
      await onConnectGSheet(gsheetUrl.trim());
      setGsheetSuccess('Connected successfully! Data will sync automatically each time the page opens.');
      setGsheetUrl('');
      setTimeout(() => setGsheetSuccess(''), 5000);
    } catch (err) {
      setGsheetError(err.message || 'Connect failed');
    } finally {
      setGsheetLoading(false);
    }
  };

  const totalRows = sources.reduce((sum, s) => sum + (Number(s.rows) || 0), 0);
  const totalPages = sources.reduce((sum, s) => sum + (Number(s.pageCount) || 0), 0);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await onUploadFiles(files);
    e.target.value = null;
  };

  return (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.xlsx,.xlsm,.xls"
      />

      <div className="max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#17335f]">Data Management</h1>
            <p className="text-slate-500 mt-1">Upload Excel/CSV and consolidate all data into one central SQLite table with file and page names.</p>
          </div>
        </div>

      <div className="bg-gradient-to-br from-[#00a4e4] to-[#3860be] rounded-2xl p-6 text-white shadow-lg flex items-center justify-between animate-stagger-1">
        <div>
          <div className="text-blue-100 font-medium mb-1">Central Table Rows</div>
          <div className="text-3xl font-extrabold">{totalRows.toLocaleString()} <span className="text-lg font-medium text-blue-200">Rows</span></div>
        </div>
        <div className="text-right">
          <div className="text-blue-100 font-medium mb-1">Files / Pages</div>
          <div className="text-2xl font-bold">{sources.length} / {totalPages}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 min-h-[270px] flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-ktb animate-stagger-2 ${uploading ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-[#bfe8f8] bg-white hover:bg-[#e8f7fd] hover:border-[#00a4e4]'}`}
        >
          <div className="w-16 h-16 bg-[#e8f7fd] text-[#00a4e4] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Upload Excel / CSV</h3>
          <button className="mt-6 h-12 px-6 bg-[#00a4e4] text-white text-base font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 pointer-events-none">
            <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-8 min-h-[270px] flex flex-col items-center justify-center text-center shadow-ktb transition-all group animate-stagger-3 ${gsheetLoading ? 'border-[#bfe8f8] bg-[#e8f7fd]' : 'border-[#bfe8f8] bg-white hover:bg-[#e8f7fd] hover:border-[#00a4e4]'}`}>
          <div className="w-16 h-16 bg-[#e8f7fd] text-[#00a4e4] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Link2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Google Sheet Connector</h3>
          <div className="mt-6 flex items-stretch gap-2 w-full max-w-sm">
            <input
              type="text"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={gsheetUrl}
              onChange={(e) => { setGsheetUrl(e.target.value); setGsheetError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleGSheetConnect()}
              disabled={gsheetLoading}
              className="h-12 flex-1 px-3 text-sm border border-[#d7e8f6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00a4e4]/20 focus:border-[#00a4e4] disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={handleGSheetConnect}
              disabled={gsheetLoading || !gsheetUrl.trim()}
              className="h-12 px-5 bg-[#00a4e4] text-white text-base font-semibold rounded-xl shadow-sm hover:bg-[#008cc2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {gsheetLoading ? (
                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" /></svg> Connecting...</>
              ) : (
                <><Plus className="w-4 h-4" /> Connect</>
              )}
            </button>
          </div>
          {gsheetError && <p className="text-xs text-red-500 mt-2">{gsheetError}</p>}
          {gsheetSuccess && <p className="text-xs text-emerald-600 mt-2 font-medium">{gsheetSuccess}</p>}
        </div>
      </div>

      {gsheetConnections.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#d7e8f6] shadow-ktb overflow-hidden animate-stagger-4">
          <div className="px-6 py-4 border-b border-[#d7e8f6] flex justify-between items-center bg-[#e8f7fd]">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#00a4e4]" />
              <h2 className="text-base font-bold text-slate-900">Connected Google Sheets</h2>
            </div>
            {syncing && <span className="text-xs text-emerald-600 flex items-center gap-1"><svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4" strokeDashoffset="10" /></svg> Syncing...</span>}
          </div>
          <div className="divide-y divide-slate-100">
            {gsheetConnections.map((conn) => (
              <div key={conn.connectionId} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">{conn.label}</div>
                    <div className="text-xs text-slate-400 truncate">{conn.url}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt + 'Z').toLocaleString() : 'Never'}
                      {' · '}{conn.lastSyncRows || 0} rows · {conn.lastSyncPages || 0} pages
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onDisconnectGSheet(conn.connectionId)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex-shrink-0"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#d7e8f6] shadow-ktb overflow-hidden animate-stagger-5">
        <div className="px-6 py-5 border-b border-[#d7e8f6] flex justify-between items-center bg-[#f6fbff]">
          <h2 className="text-lg font-bold text-[#17335f]">Connected Sources</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {sources.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50/30">
              <div className="w-16 h-16 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              No uploaded files yet
            </div>
          ) : (
            sources.map((source) => (
              <div key={source.sourceId} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
                    {String(source.type || '').includes('csv') ? <FileText className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{source.name}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {source.rows?.toLocaleString()} rows
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Updated: {toDisplayDate(source.date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                    {source.status || 'Active'}
                  </div>
                  <button
                    onClick={() => setItemToDelete(source)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    title="Delete source"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Source</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Remove data from <span className="font-semibold text-slate-800">{itemToDelete.name}</span> ?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onDeleteSource(itemToDelete.sourceId);
                    setItemToDelete(null);
                  }}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};


// --- features/dashboard/DashboardLayout.jsx ---




function DashboardLayout({
  dashboard,
  controller,
  children
}) {
  const {
    activeView,
    setActiveView,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    openDropdown,
    setOpenDropdown,
    userSearchText,
    setUserSearchText,
    segmentTypeSearchText,
    setSegmentTypeSearchText,
    documentFileSearch,
    setDocumentFileSearch,
    documentSheetSearch,
    setDocumentSheetSearch,
  } = controller;

  return (
    <div className="flex h-screen bg-[#fbfdff] font-sans text-slate-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <FilterBar
          dashboard={dashboard}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          userSearchText={userSearchText}
          setUserSearchText={setUserSearchText}
          segmentTypeSearchText={segmentTypeSearchText}
          setSegmentTypeSearchText={setSegmentTypeSearchText}
          documentFileSearch={documentFileSearch}
          setDocumentFileSearch={setDocumentFileSearch}
          documentSheetSearch={documentSheetSearch}
          setDocumentSheetSearch={setDocumentSheetSearch}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-[#17335f]/40 backdrop-blur-sm z-[140] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {dashboard.errorMessage && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{dashboard.errorMessage}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}


// --- features/dashboard/DashboardView.jsx ---













function ToggleSetting({ checked, onChange, children, notice }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group relative">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-[#00a4e4]' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">{children}</span>
      {notice && (
        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl animate-bounce-in z-20">
          {notice}
        </div>
      )}
    </label>
  );
}

const DashboardView = React.memo(({
  dashboard,
  workloadVisibleRows,
  showMatrixQuadrants,
  setShowMatrixQuadrants,
  showProcessBreakdownIdle,
  setShowProcessBreakdownIdle,
  showProcessBreakdownLabels,
  setShowProcessBreakdownLabels,
  setSelectedGanttSegment,
  setExpandedVisualizationId,
  setShowExportConfirm
}) => {
  const {
    kpiData,
    ganttVisibleSegments,
    filteredBaseSegments,
    selectedSegmentTypes,
    contributionRows,
    matrixRows,
    showIdle,
    setShowIdle,
    showWorkloadIdle,
    setShowWorkloadIdle,
    showWorkloadSystem,
    setShowWorkloadSystem,
  } = dashboard;

  const processBreakdownData = React.useMemo(() => {
    const totals = { Uploading: 0, Processing: 0, Reprocess: 0, Review: 0, Edit: 0, Idle: 0 };
    filteredBaseSegments.forEach(s => {
      const segmentType = String(s.segmentType || '');
      const drillGroup = toDrillGroup(s.segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return;
      if (!showProcessBreakdownIdle && drillGroup === 'Idle') return;
      const duration = Number(s.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.Uploading += duration;
      else if (drillGroup === 'Processing') totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') totals.Reprocess += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.Review += duration;
      else if (drillGroup === 'Edit' || drillGroup === 'EditAndComplete') totals.Edit += duration;
      else if (drillGroup === 'Idle') totals.Idle += duration;
      else totals.Idle += duration;
    });
    return Object.entries(totals)
      .filter(([label]) => showProcessBreakdownIdle || label !== 'Idle')
      .map(([label, seconds]) => ({
        label,
        seconds,
        color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
      }));
  }, [filteredBaseSegments, selectedSegmentTypes, showProcessBreakdownIdle]);

  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [showWorkloadFilterMenu, setShowWorkloadFilterMenu] = useState(false);
  const [showProcessFilterMenu, setShowProcessFilterMenu] = useState(false);
  const [showMatrixFilterMenu, setShowMatrixFilterMenu] = useState(false);
  const [ganttSingleLaneMode, setGanttSingleLaneMode] = usePersistentState('filter_ganttSingleLaneMode', false);
  const [showSystemLane, setShowSystemLane] = usePersistentState('filter_showSystemLane', true);
  const [showStarMarkers, setShowStarMarkers] = usePersistentState('filter_showStarMarkers', true);
  const [ganttCollapseGaps, setGanttCollapseGaps] = usePersistentState('filter_ganttCollapseGaps', false);
  const [showGanttLegend, setShowGanttLegend] = usePersistentState('filter_showGanttLegend', true);
  const [timelineNotice, setTimelineNotice] = useState('');

  const timelineFilterRef = useRef(null);
  const workloadFilterRef = useRef(null);
  const processFilterRef = useRef(null);
  const matrixFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineFilterRef.current && !timelineFilterRef.current.contains(event.target)) setShowTimelineFilterMenu(false);
      if (workloadFilterRef.current && !workloadFilterRef.current.contains(event.target)) setShowWorkloadFilterMenu(false);
      if (processFilterRef.current && !processFilterRef.current.contains(event.target)) setShowProcessFilterMenu(false);
      if (matrixFilterRef.current && !matrixFilterRef.current.contains(event.target)) setShowMatrixFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!timelineNotice) return undefined;
    const timer = setTimeout(() => setTimelineNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [timelineNotice]);

  const toggleSystemLane = () => {
    const nextValue = !showSystemLane;
    setShowSystemLane(nextValue);
    if (nextValue && showIdle && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleIdleGaps = () => {
    const nextValue = !showIdle;
    setShowIdle(nextValue);
    if (nextValue && showSystemLane && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleCollapseGaps = () => {
    if (!ganttCollapseGaps && showSystemLane && showIdle) {
      setTimelineNotice('Cannot collapse gaps when both System and Idle lanes are visible');
      return;
    }
    setGanttCollapseGaps(!ganttCollapseGaps);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17335f]">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Real-time performance metrics and timeline analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi, idx) => (
          <div key={kpi.id} className={`relative bg-white p-5 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-${Math.min(idx + 1, 5)}`}>
            {kpi.id === 6 && (
              /* Krungthai mascot sitting on top of the System Time card */
              <div className="absolute bottom-full right-2 w-28 h-28 pointer-events-none select-none z-0">
                <img 
                  src="https://i.postimg.cc/zvnXJcPC/d-sin-th-y-ngmi-di-t-ngch-x-(1).png" 
                  className="w-full h-full object-contain object-bottom opacity-100 brightness-[1.15]"
                  alt="Krungthai mascot"
                />
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-4 relative z-10`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1 relative z-10">{kpi.label}</div>
            <div className="text-3xl font-extrabold text-[#17335f] relative z-10">{kpi.value}</div>
            <div className="relative z-10">
              <KpiSubtext text={kpi.subtext} />
            </div>
          </div>
        ))}
      </div>

      <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb relative group animate-stagger-2 ${showTimelineFilterMenu ? 'z-[120]' : 'z-10'}`}>
        <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowExportConfirm(true)} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><FileSpreadsheet className="w-4 h-4" /></button>
          <div className="relative" ref={timelineFilterRef}>
            <button onClick={() => setShowTimelineFilterMenu(!showTimelineFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showTimelineFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
            {showTimelineFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline Settings</div>
                <div className="space-y-3">
                  <ToggleSetting checked={ganttSingleLaneMode} onChange={() => setGanttSingleLaneMode(!ganttSingleLaneMode)}>Merge User Lanes</ToggleSetting>
                  <ToggleSetting checked={showSystemLane} onChange={toggleSystemLane}>Show System Lane</ToggleSetting>
                  <ToggleSetting checked={showIdle} onChange={toggleIdleGaps}>Show Idle Gaps</ToggleSetting>
                  <ToggleSetting checked={showStarMarkers} onChange={() => setShowStarMarkers(!showStarMarkers)}>Show Event Markers</ToggleSetting>
                  <ToggleSetting checked={ganttCollapseGaps} onChange={toggleCollapseGaps} notice={timelineNotice}>Collapse Time Gaps</ToggleSetting>
                  <ToggleSetting checked={showGanttLegend} onChange={() => setShowGanttLegend(!showGanttLegend)}>Show Legend</ToggleSetting>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setExpandedVisualizationId('gantt')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
        </div>
        <h2 className="text-lg font-bold mb-6 text-[#17335f]">Timeline by User</h2>
        {ganttVisibleSegments.length === 0 ? <EmptyState icon={LayoutDashboard} title="No Data" /> : (
          <GanttTimelineChart
            segments={ganttVisibleSegments}
            onSelectSegment={setSelectedGanttSegment}
            singleLane={ganttSingleLaneMode}
            showSystemLane={showSystemLane}
            showIdleLane={showIdle}
            showStarMarkers={showStarMarkers}
            collapseGaps={ganttCollapseGaps}
            showGanttLegend={showGanttLegend}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-3">
          <div className="absolute right-4 top-4 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative" ref={workloadFilterRef}>
              <button onClick={() => setShowWorkloadFilterMenu(!showWorkloadFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showWorkloadFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
              {showWorkloadFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Workload Settings</div>
                  <div className="space-y-3">
                    <ToggleSetting checked={showWorkloadIdle} onChange={() => setShowWorkloadIdle(!showWorkloadIdle)}>Show Idle Time</ToggleSetting>
                    <ToggleSetting checked={showWorkloadSystem} onChange={() => setShowWorkloadSystem(!showWorkloadSystem)}>Show System Time</ToggleSetting>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setExpandedVisualizationId('donut')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
          </div>
          <h2 className="text-lg font-bold mb-4 text-[#17335f]">Workload Share</h2>
          <div className="flex-1 min-h-0">
            {workloadVisibleRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <DonutWorkloadChart rows={workloadVisibleRows} />}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#17335f]">Top User Work Mix</h2>
            <button onClick={() => setExpandedVisualizationId('contribution')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 min-h-0">
            {contributionRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <UserContributionStackChart rows={contributionRows} maxVisibleRows={3} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4 ${showProcessFilterMenu ? 'z-[120]' : 'z-10'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#17335f]">Process Time Breakdown</h2>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative" ref={processFilterRef}>
                <button onClick={() => setShowProcessFilterMenu(!showProcessFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showProcessFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
                {showProcessFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Process Settings</div>
                    <div className="space-y-3">
                      <ToggleSetting checked={showProcessBreakdownIdle} onChange={() => setShowProcessBreakdownIdle(!showProcessBreakdownIdle)}>Show Idle Time</ToggleSetting>
                      <ToggleSetting checked={showProcessBreakdownLabels} onChange={() => setShowProcessBreakdownLabels(!showProcessBreakdownLabels)}>Show Bar Labels</ToggleSetting>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setExpandedVisualizationId('process-breakdown')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {filteredBaseSegments.length === 0 ? <EmptyState icon={Clock} title="No Data" /> : <ProcessTimeBreakdownChart data={processBreakdownData} showLabels={showProcessBreakdownLabels} />}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#17335f]">Quality vs Edit Matrix</h2>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative" ref={matrixFilterRef}>
                <button onClick={() => setShowMatrixFilterMenu(!showMatrixFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showMatrixFilterMenu ? 'text-blue-600 border-blue-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
                {showMatrixFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter" onMouseLeave={() => setShowMatrixFilterMenu(false)}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Chart Controls</div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={showMatrixQuadrants} onChange={() => setShowMatrixQuadrants(!showMatrixQuadrants)} />
                        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Show Quadrant Labels</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setExpandedVisualizationId('matrix')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {matrixRows.length === 0 ? <EmptyState icon={Search} title="No Data" /> : <ReworkMatrixScatterChart rows={matrixRows} showQuadrants={showMatrixQuadrants} />}
          </div>
        </div>
      </div>
    </div>
  );
});


// --- features/dashboard/views/SystemPerformanceView.jsx ---







function systemPerformancePercentile(values, ratio) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function buildSystemRows(segments) {
  const byDate = new Map();
  const byDocument = new Map();

  segments.forEach((segment) => {
    const durationSeconds = safeNumber(segment.durationSeconds);
    if (durationSeconds <= 0) return;

    const segmentType = String(segment.segmentType || '');
    const dateLabel = String(segment.start || '').slice(0, 10) || 'Unknown';
    if (!byDate.has(dateLabel)) byDate.set(dateLabel, []);
    byDate.get(dateLabel).push(durationSeconds);

    const documentLabel = segment.documentLabel || segment.fileName || segment.documentId || 'Unknown Document';
    if (!byDocument.has(documentLabel)) {
      byDocument.set(documentLabel, {
        id: documentLabel,
        documentLabel,
        processingSeconds: 0,
        reprocessSeconds: 0,
        waitingSeconds: 0,
        totalSeconds: 0,
      });
    }

    const row = byDocument.get(documentLabel);
    if (segmentType.includes('REPROCESS')) row.reprocessSeconds += durationSeconds;
    else if (segmentType.startsWith('SYSTEM_')) row.processingSeconds += durationSeconds;
    else if (segmentType.startsWith('IDLE_')) row.waitingSeconds += durationSeconds;
    row.totalSeconds += durationSeconds;
  });

  return {
    trendRows: Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([dateLabel, values]) => ({
      id: dateLabel,
      dateLabel,
      avgSeconds: values.reduce((sum, value) => sum + value, 0) / values.length,
      p90Seconds: systemPerformancePercentile(values, 0.9),
      docCount: values.length,
    })),
    bottleneckRows: Array.from(byDocument.values()).sort((a, b) => b.totalSeconds - a.totalSeconds),
  };
}

function SystemPerformanceView({ segments, flowRows }) {
  const { trendRows, bottleneckRows } = useMemo(() => buildSystemRows(segments), [segments]);
  const comparisonRows = useMemo(() => (
    flowRows.map((row) => ({
      ...row,
      id: row.transitionKey,
      label: row.transitionLabel,
    }))
  ), [flowRows]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold mb-6">Processing Trend</h2>
        <SystemProcessingTrendChart rows={trendRows} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Pareto Analysis</h2>
          <SystemParetoChart rows={bottleneckRows} />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Flow Comparison</h2>
          <FlowDelayComparisonTable rows={comparisonRows} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold mb-6">System Bottlenecks</h2>
        <SystemBottleneckTable rows={bottleneckRows} />
      </div>
    </div>
  );
}


// --- features/dashboard/components/ExpandedVisualizationModal.jsx ---










const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const {
    ganttVisibleSegments,
    processBreakdownSegments,
    selectedSegmentTypes,
    showProcessBreakdownIdle,
    showProcessBreakdownLabels,
    workloadVisibleRows,
    contributionRows,
    matrixRows,
    showMatrixQuadrants,
  } = data;

  const processBreakdownData = React.useMemo(() => {
    const totals = { Uploading: 0, Processing: 0, Reprocess: 0, Review: 0, Edit: 0, Idle: 0 };
    const sourceSegments = processBreakdownSegments || ganttVisibleSegments;
    sourceSegments.forEach(s => {
      const segmentType = String(s.segmentType || '');
      const drillGroup = toDrillGroup(s.segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if ((selectedSegmentTypes || []).length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return;
      if (!showProcessBreakdownIdle && drillGroup === 'Idle') return;
      const duration = Number(s.durationSeconds) || 0;
      if (drillGroup === 'Uploading') totals.Uploading += duration;
      else if (drillGroup === 'Processing') totals.Processing += duration;
      else if (drillGroup === 'Reprocessing') totals.Reprocess += duration;
      else if (drillGroup === 'Review' || drillGroup === 'ReviewAutoClose') totals.Review += duration;
      else if (drillGroup === 'Edit' || drillGroup === 'EditAndComplete') totals.Edit += duration;
      else if (drillGroup === 'Idle') totals.Idle += duration;
      else totals.Idle += duration;
    });
    return Object.entries(totals)
      .filter(([label]) => showProcessBreakdownIdle || label !== 'Idle')
      .map(([label, seconds]) => ({
        label,
        seconds,
        color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
      }));
  }, [ganttVisibleSegments, processBreakdownSegments, selectedSegmentTypes, showProcessBreakdownIdle]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-8 viz-overlay-enter" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-[95vw] h-[92vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden viz-panel-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 md:px-10 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-extrabold text-[#17335f]">Full View Analysis</h2>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Advanced Visualization</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all hover:rotate-90 duration-300"><X className="w-8 h-8" /></button>
        </div>
        <div className="flex-1 overflow-auto p-6 md:p-10 no-scrollbar">
          {visualizationId === 'gantt' && <GanttTimelineChart segments={ganttVisibleSegments} expanded />}
          {visualizationId === 'donut' && <DonutWorkloadChart rows={workloadVisibleRows} expanded />}
          {visualizationId === 'process-breakdown' && <ProcessTimeBreakdownChart data={processBreakdownData} showLabels={showProcessBreakdownLabels} />}
          {visualizationId === 'contribution' && <UserContributionStackChart rows={contributionRows} expanded />}
          {visualizationId === 'matrix' && <ReworkMatrixScatterChart rows={matrixRows} showQuadrants={showMatrixQuadrants} expanded />}
        </div>
      </div>
    </div>
  );
});


// --- features/dashboard/components/ExportConfirmModal.jsx ---



function ExportConfirmModal({ isOpen, onClose, onConfirm, count }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
        <FileSpreadsheet className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Export to Excel</h3>
        <p className="text-slate-500 mb-8">Export {count} segments?</p>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Export</button>
        </div>
      </div>
    </div>
  );
}


// --- features/dashboard/components/SegmentDetailPopup.jsx ---




function SegmentDetailPopup({ segment, onClose }) {
  if (!segment) return null;

  const isSystem = segment.actorType === 'System' || (segment.userName || '').toLowerCase() === 'system';
  
  // Decorative type label based on segment type
  const getTypeTag = () => {
    if (isSystem) return { label: 'Automated Process', bg: 'bg-slate-100', text: 'text-slate-600', icon: Server };
    if (segment.segmentType?.includes('EDIT')) return { label: 'User Correction', bg: 'bg-amber-50', text: 'text-amber-700', icon: RefreshCw };
    if (segment.segmentType?.includes('COMPLETE') || segment.segmentType?.includes('APPROVAL')) return { label: 'Final Approval', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: RefreshCw };
    return { label: 'User Interaction', bg: 'bg-blue-50', text: 'text-blue-700', icon: User };
  };

  const tag = getTypeTag();
  const IconComponent = tag.icon || User;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 confirm-overlay-enter" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden confirm-panel-enter" onClick={e => e.stopPropagation()}>
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-1.5">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${tag.bg} ${tag.text} text-[10px] font-bold uppercase tracking-wider mb-2`}>
                <IconComponent className="w-3 h-3" />
                {tag.label}
              </div>
              <h3 className="text-2xl font-bold text-[#17335f] leading-tight">
                {toGanttSegmentTypeLabel(segment.segmentType)}
              </h3>
              <p className="text-slate-400 text-sm font-medium">Detailed activity metrics and context</p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" />
                  Responsible Actor
                </div>
                <div className="text-base font-bold text-[#17335f]">
                  {segment.userName || 'System Auto'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-medium">
                  {isSystem ? 'Automated system task' : 'Manual user operation'}
                </div>
              </div>

              <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Time Spent
                </div>
                <div className="text-base font-bold text-[#00a4e4]">
                  {formatDuration(segment.durationSeconds)}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 font-medium">
                  Net processing duration
                </div>
              </div>
            </div>

            {/* Asset & Context Information */}
            <div className="p-6 bg-[#fbfdff] rounded-2xl border border-[#eef8fd] space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#d7e8f6] shrink-0">
                  <FileText className="w-6 h-6 text-[#3860be]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source Document</div>
                  <div className="text-base font-bold text-[#17335f] break-all">
                    {segment.fileName || 'System Log'}
                  </div>
                  {segment.pageName && (
                    <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-blue-50 text-[#3860be] text-[11px] font-bold rounded-md border border-blue-100/50">
                      <FileText className="w-3 h-3" />
                      Page/Sheet: {segment.pageName}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-5 border-t border-[#eef8fd]">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Execution Start</div>
                  <div className="text-[13px] font-bold text-slate-700">
                    {toDisplayDate(segment.start)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Execution End</div>
                  <div className="text-[13px] font-bold text-slate-700">
                    {toDisplayDate(segment.end)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// --- app.jsx ---












function App() {
  const dashboard = useDashboardData();
  const controller = useAppController(dashboard);

  return (
    <>
      <DashboardLayout dashboard={dashboard} controller={controller}>
        {controller.activeView === 'data-management' ? (
          <DataManagementView
            sources={dashboard.sources}
            onUploadFiles={controller.handleUploadFiles}
            onDeleteSource={controller.handleDeleteSource}
            onConnectGSheet={controller.handleConnectGSheet}
            onDisconnectGSheet={controller.handleDisconnectGSheet}
            gsheetConnections={dashboard.gsheetConnections}
            uploading={controller.uploading}
            syncing={dashboard.syncing}
          />
        ) : controller.activeView === 'system-performance' ? (
          <SystemPerformanceView segments={dashboard.ganttVisibleSegments} flowRows={dashboard.flowRows} />
        ) : (
          <DashboardView
            dashboard={dashboard}
            workloadVisibleRows={controller.workloadVisibleRows}
            showMatrixQuadrants={controller.showMatrixQuadrants}
            setShowMatrixQuadrants={controller.setShowMatrixQuadrants}
            showProcessBreakdownIdle={controller.showProcessBreakdownIdle}
            setShowProcessBreakdownIdle={controller.setShowProcessBreakdownIdle}
            showProcessBreakdownLabels={controller.showProcessBreakdownLabels}
            setShowProcessBreakdownLabels={controller.setShowProcessBreakdownLabels}
            setSelectedGanttSegment={controller.setSelectedGanttSegment}
            setExpandedVisualizationId={controller.setExpandedVisualizationId}
            setShowExportConfirm={controller.setShowExportConfirm}
          />
        )}
      </DashboardLayout>

      <SegmentDetailPopup
        segment={controller.selectedGanttSegment}
        onClose={() => controller.setSelectedGanttSegment(null)}
      />
      <ExpandedVisualizationModal
        visualizationId={controller.expandedVisualizationId}
        onClose={() => controller.setExpandedVisualizationId('')}
        data={{
          ganttVisibleSegments: dashboard.ganttVisibleSegments,
          processBreakdownSegments: dashboard.filteredBaseSegments,
          selectedSegmentTypes: dashboard.selectedSegmentTypes,
          showProcessBreakdownIdle: controller.showProcessBreakdownIdle,
          showProcessBreakdownLabels: controller.showProcessBreakdownLabels,
          workloadVisibleRows: controller.workloadVisibleRows,
          contributionRows: dashboard.contributionRows,
          matrixRows: dashboard.matrixRows,
          showMatrixQuadrants: controller.showMatrixQuadrants,
        }}
      />
      <ExportConfirmModal
        isOpen={controller.showExportConfirm}
        onClose={() => controller.setShowExportConfirm(false)}
        onConfirm={controller.confirmExportTimeline}
        count={dashboard.ganttVisibleSegments.length}
      />
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);

