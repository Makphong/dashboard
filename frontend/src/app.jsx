import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import {
  Users, Server, Clock, Timer, RefreshCw, AlertTriangle,
  Search, Calendar, ChevronDown, User, LayoutDashboard,
  Menu, X, ChevronLeft, ChevronRight, Database, UploadCloud, Link2,
  FileText, FileSpreadsheet, Trash2, CheckCircle2, Plus, Maximize2
} from 'lucide-react';

const API_BASE = '';
const FRONTEND_BUILD_VERSION = '2026-05-25-timeline-export-01';
const CHART_PALETTE = ['#2563EB', '#0EA5E9', '#14B8A6', '#22C55E', '#EAB308', '#F97316', '#EF4444', '#8B5CF6', '#EC4899', '#64748B'];
const FLOW_SESSION_GAP_MAX_SECONDS = 2 * 60 * 60;
const FLOW_MIN_OCCURRENCES = 2;
const SEGMENT_COLORS = {
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
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: '#94A3B8',
  IDLE_AFTER_SYSTEM_REPROCESS: '#94A3B8',
  AUTO_TIMEOUT_MARKER: '#DC2626',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: '#475569',
  REOPEN_MARKER: '#A855F7',
};
const SEGMENT_TYPE_SHORT_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed',
  USER_EDITING_CORRECTION: 'Edit',
  USER_COMPLETION_APPROVAL: 'Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit & Complete',
  USER_UPLOADING: 'Upload',
  SYSTEM_INITIAL_PROCESSING: 'Processing',
  SYSTEM_SCHEDULED_REPROCESSING: 'Reprocessing',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Waiting Reprocess',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'System Reprocess',
  REOPEN_MARKER: 'Reopen',
};
const GANTT_SEGMENT_DISPLAY_LABELS = {
  USER_REVIEW_COMMENT_CHECK: 'Review',
  USER_EDITING_CORRECTION: 'Edit',
  USER_COMPLETION_APPROVAL: 'Complete',
  USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL: 'Edit & Complete',
  USER_UPLOADING: 'Upload',
  USER_REVIEW_AUTO_TIMEOUT: 'Auto Closed (Timeout)',
  SYSTEM_INITIAL_PROCESSING: 'Processing',
  SYSTEM_SCHEDULED_REPROCESSING: 'Reprocessing',
  SYSTEM_INTERNAL_TRANSITION: 'System Transition',
  AUTO_TIMEOUT_MARKER: 'Auto Timeout Marker',
  IDLE_WAITING_FOR_REVIEW: 'Waiting Review',
  IDLE_WAITING_FOR_REREVIEW: 'Waiting Re-Review',
  IDLE_WAITING_FOR_SCHEDULED_REPROCESS: 'Waiting Reprocess',
  IDLE_AFTER_SYSTEM_REPROCESS: 'Waiting Reprocess',
  SYSTEM_SCHEDULED_REPROCESSING_ROUND_2: 'System Reprocess Round 2',
  REOPEN_MARKER: 'Reopen Marker',
};

const GANTT_DRILL_GROUPS = [
  { key: 'Uploading', label: 'Uploading', color: '#8B5CF6' },
  { key: 'Processing', label: 'Processing', color: '#334155' },
  { key: 'Review', label: 'Review', color: '#06B6D4' },
  { key: 'ReviewAutoClose', label: 'Review Auto Close', color: '#06B6D4' },
  { key: 'Edit', label: 'Edit', color: '#F59E0B' },
  { key: 'EditAndComplete', label: 'Edit and Complete', color: '#10B981' },
  { key: 'Idle', label: 'Idle', color: '#94A3B8' },
];

const GANTT_MIN_ZOOM_SCALE = 0.35;
const GANTT_MAX_ZOOM_SCALE = 8000; // 1000x more than previous 8x ceiling.
const GANTT_MAX_TIMELINE_WIDTH_PX = 120000000;

const GANTT_DRILL_GROUP_COLORS = {
  Uploading: '#8B5CF6',
  Processing: '#334155',
  Review: '#06B6D4',
  ReviewAutoClose: '#06B6D4',
  Reprocessing: '#334155',
  Edit: '#F59E0B',
  EditAndComplete: '#10B981',
  Idle: '#94A3B8',
};

const GANTT_DRILL_GROUP_LABELS = {
  Uploading: 'Uploading',
  Processing: 'Processing',
  Review: 'Review',
  ReviewAutoClose: 'Review Auto Close',
  Reprocessing: 'Reprocessing',
  Edit: 'Edit',
  EditAndComplete: 'Edit and Complete',
  Idle: 'Idle',
};

const CORE_WORK_SESSION_TYPES = new Set([
  'USER_REVIEW_COMMENT_CHECK',
  'USER_REVIEW_AUTO_TIMEOUT',
  'USER_EDITING_CORRECTION',
  'USER_COMPLETION_APPROVAL',
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
    id: 'user-review-edit-to-next-user-step',
    label: 'User Action -> Next User Step',
    description: '',
  },
  {
    id: 'upload-to-latest-complete',
    label: 'Upload -> Final Complete',
    description: '',
  },
  {
    id: 'processing-round-2-to-user',
    label: 'Round 2 Processing -> User Action',
    description: '',
  },
];

const TRANSITION_FRIENDLY_LABELS = {
  // อัปโหลด → ขั้นต่อไป
  'USER_UPLOADING=>SYSTEM_INITIAL_PROCESSING': 'อัปโหลดเสร็จ → ระบบเริ่มประมวลผล',
  'USER_UPLOADING=>IDLE_WAITING_FOR_REVIEW': 'อัปโหลดเสร็จ → รอผู้ตรวจ',
  'USER_UPLOADING=>USER_REVIEW_COMMENT_CHECK': 'อัปโหลดเสร็จ → เริ่ม Review ทันที',
  'USER_UPLOADING=>USER_REVIEW_AUTO_TIMEOUT': 'อัปโหลดเสร็จ → ไม่มีคนตรวจ (หมดเวลา)',
  // ระบบประมวลผล → ขั้นต่อไป
  'SYSTEM_INITIAL_PROCESSING=>IDLE_WAITING_FOR_REVIEW': 'ประมวลผลเสร็จ → รอผู้ตรวจ',
  'SYSTEM_INITIAL_PROCESSING=>USER_REVIEW_COMMENT_CHECK': 'ประมวลผลเสร็จ → เริ่ม Review ทันที',
  'SYSTEM_INITIAL_PROCESSING=>USER_EDITING_CORRECTION': 'ประมวลผลเสร็จ → เริ่มแก้ไขทันที',
  // รอตรวจ → ผู้ใช้มาทำงาน
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_COMMENT_CHECK': 'รอผู้ตรวจ → เริ่ม Review',
  'IDLE_WAITING_FOR_REVIEW=>USER_REVIEW_AUTO_TIMEOUT': 'รอผู้ตรวจนานเกิน → หมดเวลา',
  'IDLE_WAITING_FOR_REREVIEW=>USER_REVIEW_COMMENT_CHECK': 'รอตรวจซ้ำ → เริ่ม Review',
  'IDLE_WAITING_FOR_REREVIEW=>USER_EDITING_CORRECTION': 'รอตรวจซ้ำ → เริ่มแก้ไข',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_REVIEW_COMMENT_CHECK': 'ประมวลผลซ้ำเสร็จ → เริ่ม Review',
  'IDLE_AFTER_SYSTEM_REPROCESS=>USER_EDITING_CORRECTION': 'ประมวลผลซ้ำเสร็จ → เริ่มแก้ไข',
  'IDLE_WAITING_FOR_SCHEDULED_REPROCESS=>SYSTEM_SCHEDULED_REPROCESSING': 'รอคิว → ระบบประมวลผลซ้ำ',
  // Review → ขั้นต่อไป
  'USER_REVIEW_COMMENT_CHECK=>USER_COMPLETION_APPROVAL': 'Review ผ่าน → อนุมัติ',
  'USER_REVIEW_COMMENT_CHECK=>USER_EDITING_CORRECTION': 'Review ไม่ผ่าน → ส่งแก้ไข',
  'USER_REVIEW_COMMENT_CHECK=>IDLE_WAITING_FOR_REREVIEW': 'Review เสร็จ → รอตรวจซ้ำ',
  'USER_REVIEW_COMMENT_CHECK=>SYSTEM_SCHEDULED_REPROCESSING': 'Review เสร็จ → ส่งระบบประมวลผลซ้ำ',
  // แก้ไข → ขั้นต่อไป
  'USER_EDITING_CORRECTION=>USER_COMPLETION_APPROVAL': 'แก้ไขเสร็จ → อนุมัติ',
  'USER_EDITING_CORRECTION=>IDLE_WAITING_FOR_REREVIEW': 'แก้ไขเสร็จ → รอตรวจซ้ำ',
  'USER_EDITING_CORRECTION=>SYSTEM_SCHEDULED_REPROCESSING': 'แก้ไขเสร็จ → ส่งระบบประมวลผลซ้ำ',
  'USER_EDITING_CORRECTION=>USER_REVIEW_COMMENT_CHECK': 'แก้ไขเสร็จ → กลับมา Review',
  // หมดเวลา → กลับมาทำงาน
  'USER_REVIEW_AUTO_TIMEOUT=>USER_EDITING_CORRECTION': 'หมดเวลา Review → กลับมาแก้ไข',
  'USER_REVIEW_AUTO_TIMEOUT=>USER_REVIEW_COMMENT_CHECK': 'หมดเวลา Review → กลับมา Review',
  'USER_REVIEW_AUTO_TIMEOUT=>IDLE_WAITING_FOR_REREVIEW': 'หมดเวลา Review → รอตรวจซ้ำ',
  // อนุมัติ → ขั้นต่อไป
  'USER_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'อนุมัติแล้ว → รอตรวจซ้ำ',
  'USER_COMPLETION_APPROVAL=>SYSTEM_SCHEDULED_REPROCESSING': 'อนุมัติแล้ว → ส่งระบบประมวลผลซ้ำ',
  'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL=>IDLE_WAITING_FOR_REREVIEW': 'แก้ไข+อนุมัติ → รอตรวจซ้ำ',
  // ระบบประมวลผลซ้ำ
  'SYSTEM_SCHEDULED_REPROCESSING=>IDLE_AFTER_SYSTEM_REPROCESS': 'ระบบประมวลผลซ้ำเสร็จ → รอผู้ตรวจ',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_REVIEW_COMMENT_CHECK': 'ระบบประมวลผลซ้ำเสร็จ → เริ่ม Review',
  'SYSTEM_SCHEDULED_REPROCESSING=>USER_EDITING_CORRECTION': 'ระบบประมวลผลซ้ำเสร็จ → เริ่มแก้ไข',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>IDLE_AFTER_SYSTEM_REPROCESS': 'ประมวลผลซ้ำรอบ 2 เสร็จ → รอผู้ตรวจ',
  'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2=>USER_REVIEW_COMMENT_CHECK': 'ประมวลผลซ้ำรอบ 2 เสร็จ → เริ่ม Review',
};

const initialKpiData = [
  { id: 1, label: 'Active User Time', value: '-', subtext: 'No data', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' },
  { id: 2, label: 'Contributing Users', value: '-', subtext: 'No data', icon: Users, color: 'text-slate-400', bg: 'bg-slate-50' },
  { id: 3, label: 'Avg User Action', value: '-', subtext: 'No data', icon: Timer, color: 'text-slate-400', bg: 'bg-slate-50' },
  { id: 5, label: 'Edit Rate', value: '-', subtext: 'No data', icon: RefreshCw, color: 'text-slate-400', bg: 'bg-slate-50' },
  { id: 6, label: 'Auto Closed Actions', value: '-', subtext: 'No data', icon: AlertTriangle, color: 'text-slate-400', bg: 'bg-slate-50' },
];

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

function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 24 * DAY; // Requested threshold: over 24 days -> month
  const YEAR = 12 * MONTH; // Requested threshold: over 12 months -> year

  if (safe > YEAR) {
    const years = Math.floor(safe / YEAR);
    const months = Math.floor((safe % YEAR) / MONTH);
    return `${years}y ${months}mo`;
  }

  if (safe > MONTH) {
    const months = Math.floor(safe / MONTH);
    const days = Math.floor((safe % MONTH) / DAY);
    return `${months}mo ${days}d`;
  }

  if (safe > DAY) {
    const days = Math.floor(safe / DAY);
    const hours = Math.floor((safe % DAY) / HOUR);
    return `${days}d ${hours}h`;
  }

  const h = Math.floor(safe / HOUR);
  const m = Math.floor((safe % HOUR) / MINUTE);
  const s = safe % MINUTE;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPercent(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
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

function toDrillGroup(segmentType) {
  const type = String(segmentType || '');
  if (type === 'USER_UPLOADING') return 'Uploading';
  if (type === 'SYSTEM_INITIAL_PROCESSING' || type === 'SYSTEM_INTERNAL_TRANSITION') return 'Processing';
  if (type === 'USER_REVIEW_COMMENT_CHECK') return 'Review';
  if (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE') return 'Idle';
  if (type === 'USER_REVIEW_AUTO_TIMEOUT' || type === 'AUTO_TIMEOUT_MARKER') return 'ReviewAutoClose';
  if (
    type === 'SYSTEM_SCHEDULED_REPROCESSING'
    || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
  ) return 'Reprocessing';
  if (type === 'USER_EDITING_CORRECTION') return 'Edit';
  if (type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL' || type === 'USER_COMPLETION_APPROVAL') return 'EditAndComplete';
  return 'Processing';
}

function toTimelineLane(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (type.startsWith('SYSTEM_')) return 'System';
  if (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE') return 'Idle';
  const userName = String(userNameRaw || '').trim();
  if (userName.toLowerCase() === 'system') return 'System';
  return userName || 'Unknown User';
}

function isSystemContextSegment(segmentType) {
  const type = String(segmentType || '');
  return type.startsWith('SYSTEM_');
}

function isIdleContextSegment(segmentType) {
  const type = String(segmentType || '');
  return type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE';
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

function buildKpiData(kpis) {
  if (!kpis) return initialKpiData;
  return [
    {
      id: 1,
      label: 'Active User Time',
      value: kpis.activeUserTimeDisplay || '-',
      subtext: `Avg per user: ${kpis.avgTimePerUserDisplay || '-'}`,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      id: 2,
      label: 'Contributing Users',
      value: String(kpis.contributingUsers || 0),
      subtext: kpis.topContributorName
        ? `Top: ${kpis.topContributorName} (${kpis.topContributorDisplay})`
        : 'No user data',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      id: 3,
      label: 'Avg User Action',
      value: kpis.avgUserSessionDisplay || '-',
      subtext: `Med ${kpis.medianSessionDisplay || '-'} · ${kpis.minSessionDisplay || '-'} – ${kpis.maxSessionDisplay || '-'}`,
      icon: Timer,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      id: 5,
      label: 'Edit Rate',
      value: kpis.reworkRateDisplay || '0.0%',
      subtext: `${kpis.reworkSessions || 0} edit / ${kpis.totalSessions || 0} actions`,
      icon: RefreshCw,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
    {
      id: 6,
      label: 'Auto Closed Actions',
      value: String(kpis.autoClosedSessions || 0),
      subtext: `${kpis.autoClosedRate?.toFixed(1) || '0.0'}% of all actions`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];
}

function buildKpisFromSegments(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const userSegments = safeSegments.filter((segment) => String(segment.segmentType || '').startsWith('USER_'));
  const coreUserSegments = userSegments.filter((segment) => CORE_WORK_SESSION_TYPES.has(String(segment.segmentType || '')));
  const idleSegments = safeSegments.filter((segment) => isIdleContextSegment(segment.segmentType));

  // Use full segment time for KPI calculations.
  const effectiveDuration = (segment) => safeNumber(segment?.durationSeconds);

  const activeUserTimeSeconds = userSegments.reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const coreActiveUserTimeSeconds = coreUserSegments.reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const contributingUsers = new Set(
    userSegments
      .map((segment) => String(segment.userName || ''))
      .filter((userName) => userName && userName.toLowerCase() !== 'system')
  ).size;
  const avgUserSessionSeconds = coreUserSegments.length > 0 ? coreActiveUserTimeSeconds / coreUserSegments.length : 0;

  const idleWaitingSeconds = idleSegments.reduce((sum, segment) => sum + safeNumber(segment.durationSeconds), 0);
  const idleWaitingOccurrences = idleSegments.length;
  const autoClosedSessions = coreUserSegments.filter((segment) => segment.autoTimeout || String(segment.segmentType || '') === 'USER_REVIEW_AUTO_TIMEOUT').length;
  const reworkSessions = coreUserSegments.filter((segment) => String(segment.segmentType || '') === 'USER_EDITING_CORRECTION').length;
  const reworkRate = coreUserSegments.length > 0 ? (reworkSessions / coreUserSegments.length) : 0;

  // --- Additional insight metrics ---
  const totalCycleSeconds = activeUserTimeSeconds + idleWaitingSeconds +
    safeSegments.filter((s) => String(s.segmentType || '').startsWith('SYSTEM_')).reduce((sum, s) => sum + safeNumber(s.durationSeconds), 0);
  const idlePercentOfCycle = totalCycleSeconds > 0 ? (idleWaitingSeconds / totalCycleSeconds) * 100 : 0;
  const avgTimePerUser = contributingUsers > 0 ? activeUserTimeSeconds / contributingUsers : 0;

  // Per-user time map for top contributor
  const userTimeMap = {};
  for (const seg of userSegments) {
    const name = String(seg.userName || '').trim();
    if (name && name.toLowerCase() !== 'system') {
      userTimeMap[name] = (userTimeMap[name] || 0) + effectiveDuration(seg);
    }
  }
  const topContributor = Object.entries(userTimeMap).sort((a, b) => b[1] - a[1])[0];

  // Session duration distribution
  const sessionDurations = coreUserSegments.map((s) => effectiveDuration(s)).sort((a, b) => a - b);
  const medianSessionSeconds = sessionDurations.length > 0
    ? sessionDurations[Math.floor(sessionDurations.length / 2)]
    : 0;
  const minSessionSeconds = sessionDurations.length > 0 ? sessionDurations[0] : 0;
  const maxSessionSeconds = sessionDurations.length > 0 ? sessionDurations[sessionDurations.length - 1] : 0;

  const totalSessions = coreUserSegments.length;
  const autoClosedRate = totalSessions > 0 ? (autoClosedSessions / totalSessions) * 100 : 0;

  return {
    activeUserTimeSeconds,
    activeUserTimeDisplay: formatDuration(activeUserTimeSeconds),
    contributingUsers,
    avgUserSessionSeconds,
    avgUserSessionDisplay: formatDuration(avgUserSessionSeconds),
    idleWaitingSeconds,
    idleWaitingDisplay: formatDuration(idleWaitingSeconds),
    idleWaitingOccurrences,
    reworkRate,
    reworkRateDisplay: formatPercent(reworkRate),
    autoClosedSessions,
    // New insight fields
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
    totalSessions,
    autoClosedRate,
  };
}

const Sidebar = ({ isMobileOpen, setMobileOpen, isCollapsed, toggleCollapse, activeView, setActiveView }) => (
  <aside className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out flex flex-col
    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
    lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:static`}>

    <button
      onClick={toggleCollapse}
      className="hidden lg:flex absolute -right-3 top-8 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-500 hover:text-blue-600 hover:border-blue-300 shadow-sm z-50 transition-colors"
    >
      {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
    </button>

    <div className={`h-20 flex items-center border-b border-slate-100 ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
      {!isCollapsed ? (
        <div className="text-2xl font-extrabold tracking-tighter text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded flex items-center justify-center text-white text-sm">KTB</div>
          Analytics
        </div>
      ) : (
        <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-extrabold">KTB</div>
      )}
      <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
        <X className="w-5 h-5 text-slate-500" />
      </button>
    </div>

    <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
      {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">Dashboards</div>}
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('user-performance')} className={`flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}
          ${activeView === 'user-performance' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`} title="User Performance">
          <Users className={`w-5 h-5 flex-shrink-0 ${activeView === 'user-performance' ? 'text-blue-600' : ''}`} />
          {!isCollapsed && <span>User Performance</span>}
        </a>
        <a href="#" className={`flex items-center gap-3 py-2.5 text-slate-600 hover:bg-slate-50 border border-transparent rounded-xl font-medium transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}`} title="System Performance">
          <Server className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>System Performance</span>}
        </a>
      </nav>

      {!isCollapsed && <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-4 px-3">Data Management</div>}
      <nav className="space-y-2">
        <a href="#" onClick={() => setActiveView('data-management')} className={`flex items-center gap-3 py-2.5 rounded-xl font-semibold transition-colors
          ${isCollapsed ? 'justify-center px-0' : 'px-3'}
          ${activeView === 'data-management' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100/50 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`} title="Data Management">
          <Database className={`w-5 h-5 flex-shrink-0 ${activeView === 'data-management' ? 'text-blue-600' : ''}`} />
          {!isCollapsed && <span>Data Management</span>}
        </a>
      </nav>
    </div>

    <div className={`p-4 border-t border-slate-100 ${isCollapsed ? 'flex justify-center' : ''}`}>
      <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'px-3'} py-2`}>
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
          <User className="w-5 h-5 text-slate-500" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-semibold text-slate-900 truncate">Executive User</div>
            <div className="text-xs text-slate-500 truncate">Operation Lead</div>
          </div>
        )}
      </div>
    </div>
  </aside>
);

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
          ${active ? 'bg-blue-50 border-blue-200 shadow-[0_8px_24px_-14px_rgba(37,99,235,0.5)]' : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
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
          className={`fixed z-[120] rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_-18px_rgba(15,23,42,0.35)] overflow-y-auto no-scrollbar ${panelClassName}`}
        >
          {children}
        </div>,
        document.body
      ) : null}
    </div>
  );
};

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

const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[120px]">
    <Icon className="w-8 h-8 text-slate-300" />
    <div className="text-sm font-semibold text-slate-500">{title}</div>
    <div className="text-xs text-slate-400">{subtitle}</div>
  </div>
);

const GanttTimelineChart = ({ segments, onSelectSegment, expanded = false, singleLane = false }) => {
  const containerRef = useRef(null);
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const verticalScrollRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const zoomScaleRef = useRef(1);
  const pendingZoomAnchorRef = useRef(null);
  const timelineMetricsRef = useRef({
    displayMinTs: 0,
    displaySpanMs: 1,
    baseTimelineWidth: 2200,
    timelineWidth: 2200,
    timelinePadLeft: 14,
    timelinePadRight: 18,
    timelineSvgWidth: 2232,
  });

  const mapped = useMemo(() => (
    (segments || [])
      .map((segment, idx) => {
        const startTs = Date.parse(segment.start || '');
        const endTsRaw = Date.parse(segment.end || '');
        if (!Number.isFinite(startTs) || !Number.isFinite(endTsRaw)) return null;

        const segmentType = String(segment.segmentType || 'UNKNOWN');
        const lane = singleLane ? 'All user' : toTimelineLane(segmentType, segment.userName);

        return {
          id: `${segmentType}-${idx}`,
          segmentType,
          lane,
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
        };
      })
      .filter(Boolean)
  ), [segments, singleLane]);

  useEffect(() => {
    const bodyViewport = bodyScrollRef.current;
    if (!bodyViewport) return;
    requestAnimationFrame(() => {
      bodyViewport.scrollLeft = 0;
      if (headerScrollRef.current) headerScrollRef.current.scrollLeft = 0;
      if (verticalScrollRef.current) verticalScrollRef.current.scrollTop = 0;
    });
  }, [mapped.length]);

  if (mapped.length === 0) return null;

  const fullMinTs = mapped.reduce((min, item) => Math.min(min, item.startTs), mapped[0].startTs);
  const fullMaxTs = mapped.reduce((max, item) => Math.max(max, item.endTs), mapped[0].endTs);
  const rangePadMs = Math.min(2 * 60 * 60 * 1000, Math.max(5 * 60 * 1000, (fullMaxTs - fullMinTs) * 0.015));

  const displayMinTs = fullMinTs - rangePadMs;
  const displayMaxTs = fullMaxTs + rangePadMs;
  const displaySpanMs = Math.max(displayMaxTs - displayMinTs, 60 * 1000);
  const displaySpanHours = displaySpanMs / (1000 * 60 * 60);
  const pxPerHour = 120;

  const visibleSegments = mapped.filter((segment) => segment.endTs >= displayMinTs && segment.startTs <= displayMaxTs);
  if (visibleSegments.length === 0) return null;
  const legendItems = GANTT_DRILL_GROUPS.filter((item) => (
    item.key !== 'Reprocessing' && item.key !== 'ReviewAutoClose'
  ));

  const laneDurationMap = {};
  visibleSegments.forEach((item) => {
    if (!laneDurationMap[item.lane]) laneDurationMap[item.lane] = 0;
    laneDurationMap[item.lane] += item.durationSeconds;
  });

  const lanes = Object.keys(laneDurationMap).sort((a, b) => {
    if (a === 'System' && b !== 'System') return -1;
    if (b === 'System' && a !== 'System') return 1;
    if (a === 'Idle' && b !== 'Idle') return -1;
    if (b === 'Idle' && a !== 'Idle') return 1;
    const durationDiff = laneDurationMap[b] - laneDurationMap[a];
    if (durationDiff !== 0) return durationDiff;
    return a.localeCompare(b);
  });

  const laneToSegments = {};
  lanes.forEach((lane) => {
    laneToSegments[lane] = visibleSegments
      .filter((item) => item.lane === lane)
      .sort((a, b) => a.startTs - b.startTs);
  });

  const laneLabelWidth = expanded ? 210 : 132;
  const baseTimelineWidth = Math.min(120000, Math.max(2200, Math.round(displaySpanHours * pxPerHour)));
  const timelineWidth = Math.min(
    GANTT_MAX_TIMELINE_WIDTH_PX,
    Math.max(900, Math.round(baseTimelineWidth * zoomScale))
  );
  const timelinePadLeft = 14;
  const timelinePadRight = 18;
  const timelineSvgWidth = timelinePadLeft + timelineWidth + timelinePadRight;
  const effectivePxPerHour = timelineWidth / Math.max(displaySpanHours, 1);
  const headerHeight = 50;
  const rowHeight = 34;
  const rowGap = 10;
  const laneVisibleLimit = expanded ? Math.max(7, lanes.length) : 7;
  const rowSlotHeight = rowHeight + rowGap;
  const rowTopPadding = 8;
  const bodyChartHeight = rowTopPadding + lanes.length * rowSlotHeight + 10;
  const timelineViewportHeight = expanded
    ? Math.max(rowSlotHeight + 12, lanes.length * rowSlotHeight + 12)
    : (Math.max(1, Math.min(laneVisibleLimit, lanes.length)) * rowSlotHeight + 12);

  const tickStepCandidatesMs = [
    30 * 60 * 1000,
    60 * 60 * 1000,
    2 * 60 * 60 * 1000,
    3 * 60 * 60 * 1000,
    4 * 60 * 60 * 1000,
    6 * 60 * 60 * 1000,
    8 * 60 * 60 * 1000,
    12 * 60 * 60 * 1000,
    24 * 60 * 60 * 1000,
  ];
  const minTickPx = 120;
  const tickStepMs = tickStepCandidatesMs.find(
    (candidate) => ((candidate / (60 * 60 * 1000)) * effectivePxPerHour) >= minTickPx
  ) || (24 * 60 * 60 * 1000);
  const alignedTickStart = Math.floor(displayMinTs / tickStepMs) * tickStepMs;
  const ticks = [];
  for (let tickTs = alignedTickStart; tickTs <= displayMaxTs + tickStepMs; tickTs += tickStepMs) {
    if (tickTs >= displayMinTs && tickTs <= displayMaxTs) {
      ticks.push(tickTs);
    }
  }
  if (ticks.length === 0) ticks.push(displayMinTs);
  if (ticks[ticks.length - 1] < displayMaxTs) ticks.push(displayMaxTs);

  const getX = (timeValue) => timelinePadLeft + ((timeValue - displayMinTs) / displaySpanMs) * timelineWidth;

  zoomScaleRef.current = zoomScale;
  timelineMetricsRef.current = {
    displayMinTs,
    displaySpanMs,
    baseTimelineWidth,
    timelineWidth,
    timelinePadLeft,
    timelinePadRight,
    timelineSvgWidth,
  };

  const onBodyScroll = (event) => {
    const headerViewport = headerScrollRef.current;
    if (!headerViewport) return;
    if (Math.abs(event.currentTarget.scrollLeft - headerViewport.scrollLeft) <= 1) return;
    headerViewport.scrollLeft = event.currentTarget.scrollLeft;
  };

  const onDragStart = (event) => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return;
    dragRef.current.active = true;
    dragRef.current.startX = event.clientX;
    dragRef.current.startScrollLeft = viewport.scrollLeft;
  };

  const onDragMove = (event) => {
    const viewport = bodyScrollRef.current;
    if (!viewport || !dragRef.current.active) return;
    const delta = event.clientX - dragRef.current.startX;
    viewport.scrollLeft = dragRef.current.startScrollLeft - delta;
  };

  const onDragEnd = () => {
    dragRef.current.active = false;
  };

  useEffect(() => {
    const viewport = bodyScrollRef.current;
    if (!viewport) return undefined;

    const onNativeWheel = (event) => {
      if (!event.ctrlKey) return;
      const wheelDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (!wheelDelta) return;

      event.preventDefault();
      const metrics = timelineMetricsRef.current;
      const currentZoom = zoomScaleRef.current;
      const nextZoom = Math.max(
        GANTT_MIN_ZOOM_SCALE,
        Math.min(GANTT_MAX_ZOOM_SCALE, currentZoom * (wheelDelta < 0 ? 1.12 : (1 / 1.12)))
      );
      if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

      const viewportRect = viewport.getBoundingClientRect();
      const anchorX = Math.max(0, Math.min(viewportRect.width, event.clientX - viewportRect.left));
      const absoluteContentX = viewport.scrollLeft + anchorX;
      const anchorTimelineX = Math.max(0, Math.min(metrics.timelineWidth, absoluteContentX - metrics.timelinePadLeft));
      const anchorTime = metrics.displayMinTs + (anchorTimelineX / Math.max(1, metrics.timelineWidth)) * metrics.displaySpanMs;

      pendingZoomAnchorRef.current = { anchorX, anchorTime };
      zoomScaleRef.current = nextZoom;
      setZoomScale(nextZoom);
    };

    viewport.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  useLayoutEffect(() => {
    const viewport = bodyScrollRef.current;
    const pending = pendingZoomAnchorRef.current;
    if (!viewport || !pending) return;

    const metrics = timelineMetricsRef.current;
    const anchorTimeRatio = (pending.anchorTime - metrics.displayMinTs) / Math.max(1, metrics.displaySpanMs);
    const nextAnchorTimelineX = metrics.timelinePadLeft + (anchorTimeRatio * metrics.timelineWidth);
    const nextRawScrollLeft = nextAnchorTimelineX - pending.anchorX;
    const nextMaxScrollLeft = Math.max(0, metrics.timelineSvgWidth - viewport.clientWidth);
    const nextScrollLeft = Math.max(0, Math.min(nextMaxScrollLeft, nextRawScrollLeft));

    viewport.scrollLeft = nextScrollLeft;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = nextScrollLeft;
    pendingZoomAnchorRef.current = null;
  }, [zoomScale]);

  const showHoverTooltip = (event, segment, lane) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = event.clientX - rect.left + 12;
    const rawY = event.clientY - rect.top + 12;
    const tooltipWidth = 310;
    const tooltipHeight = 124;
    const x = Math.max(8, Math.min(rawX, rect.width - tooltipWidth - 8));
    const y = Math.max(8, Math.min(rawY, rect.height - tooltipHeight - 8));
    const groupLabel = GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup;
    setHoveredSegment({
      x,
      y,
      lane,
      groupLabel,
      segmentType: segment.segmentType,
      start: segment.start,
      end: segment.end,
      durationSeconds: segment.durationSeconds,
    });
  };

  const hideHoverTooltip = () => {
    setHoveredSegment(null);
  };

  const onBodyMouseLeave = () => {
    onDragEnd();
    hideHoverTooltip();
  };

  const pickSegment = (segment, lane) => {
    if (!onSelectSegment) return;
    onSelectSegment({
      lane,
      segmentType: segment.segmentType,
      start: segment.start,
      end: segment.end,
      durationSeconds: segment.durationSeconds,
      documentId: segment.documentId,
      fileName: segment.fileName,
      pageName: segment.pageName,
      autoTimeout: segment.autoTimeout,
    });
  };

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 py-1 text-xs text-slate-600">
        {legendItems.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
            {item.label}
          </span>
        ))}
      </div>

      <div className="rounded-xl bg-slate-50/30 overflow-hidden">
        <div className="sticky top-0 z-[6]">
          <div className="flex border-b border-slate-200 bg-slate-50">
            <svg width={laneLabelWidth} height={headerHeight} className="shrink-0 border-r border-slate-200 bg-slate-50/80">
              <text x="10" y="22" className="fill-slate-500 text-[10px] font-semibold uppercase tracking-[0.08em]">
                Lane
              </text>
            </svg>
            <div
              ref={headerScrollRef}
              className="flex-1 overflow-x-hidden no-scrollbar"
            >
              <svg width={timelineSvgWidth} height={headerHeight} className="block">
                <rect x="0" y="0" width={timelineSvgWidth} height={headerHeight} fill="#F8FAFC" />
                {ticks.map((tick, tickIdx) => {
                  const x = getX(tick);
                  const header = formatTickHeader(tick);
                  const prevTick = tickIdx > 0 ? ticks[tickIdx - 1] : null;
                  const showDate = tickIdx === 0 || !isSameCalendarDay(prevTick, tick);
                  return (
                    <g key={tick}>
                      <line x1={x} x2={x} y1={headerHeight - 20} y2={headerHeight} stroke="#E2E8F0" strokeDasharray="4 4" />
                      <text x={x} y="14" textAnchor="middle" className="fill-slate-500 text-[10px]">
                        <tspan x={x}>{showDate ? header.dateLabel : ''}</tspan>
                        <tspan x={x} dy="12">{header.timeLabel}</tspan>
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        <div ref={verticalScrollRef} className="overflow-y-auto no-scrollbar" style={{ maxHeight: `${timelineViewportHeight}px` }}>
          <div className="flex min-w-0">
            <svg width={laneLabelWidth} height={bodyChartHeight} className="shrink-0 border-r border-slate-200 bg-slate-50/70">
              {lanes.map((lane, laneIdx) => {
                const y = rowTopPadding + laneIdx * rowSlotHeight;
                return (
                  <g key={lane}>
                    <rect x="0" y={y - 2} width={laneLabelWidth} height={rowHeight + 4} fill={laneIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'} />
                    <text x="10" y={y + rowHeight / 2 + 5} className="fill-slate-700 text-[11px] font-medium">
                      {lane}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div
              ref={bodyScrollRef}
              className="flex-1 overflow-x-auto no-scrollbar cursor-grab active:cursor-grabbing"
              onScroll={onBodyScroll}
              onMouseDown={onDragStart}
              onMouseMove={onDragMove}
              onMouseUp={onDragEnd}
              onMouseLeave={onBodyMouseLeave}
            >
              <svg width={timelineSvgWidth} height={bodyChartHeight} className="block">
                {lanes.map((lane, laneIdx) => {
                  const y = rowTopPadding + laneIdx * rowSlotHeight;
                  return (
                    <rect key={`row-bg-${lane}`} x="0" y={y - 2} width={timelineSvgWidth} height={rowHeight + 4} fill={laneIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'} />
                  );
                })}

                {ticks.map((tick) => {
                  const x = getX(tick);
                  return (
                    <line key={`tick-${tick}`} x1={x} x2={x} y1="0" y2={bodyChartHeight} stroke="#E2E8F0" strokeDasharray="4 4" />
                  );
                })}

                {lanes.map((lane, laneIdx) => {
                  const y = rowTopPadding + laneIdx * rowSlotHeight;
                  const bars = laneToSegments[lane] || [];
                  return (
                    <g key={`bars-${lane}`}>
                      {bars.map((segment) => {
                        const clippedStart = Math.max(segment.startTs, displayMinTs);
                        const clippedEnd = Math.min(segment.endTs, displayMaxTs);
                        const x1 = getX(clippedStart);
                        const x2 = getX(clippedEnd);
                        const minBarWidth = segment.segmentType === 'USER_UPLOADING' ? 14 : 8;
                        const barWidth = Math.max(minBarWidth, x2 - x1);
                        const color = lane === 'Idle'
                          ? '#94A3B8'
                          : (GANTT_DRILL_GROUP_COLORS[segment.drillGroup] || SEGMENT_COLORS[segment.segmentType] || '#64748B');
                        const groupLabel = GANTT_DRILL_GROUP_LABELS[segment.drillGroup] || segment.drillGroup;
                        const typeLabel = toGanttSegmentTypeLabel(segment.segmentType);
                        const label = `${groupLabel} | ${typeLabel} (${segment.segmentType}) | ${lane} | ${formatTimeTick(segment.start)} → ${formatTimeTick(segment.end)} | ${formatDuration(segment.durationSeconds)}`;
                        const isReopenMarker = segment.segmentType === 'REOPEN_MARKER';
                        const isAutoTimeoutMarker = segment.segmentType === 'AUTO_TIMEOUT_MARKER';
                        const isMarker = isReopenMarker || isAutoTimeoutMarker;
                        const isUpload = segment.drillGroup === 'Uploading';
                        const barOpacity = '0.94';

                        if (isMarker) {
                          const cx = x1 + 6;
                          const cy = y + rowHeight / 2;
                          return (
                            <g
                              key={segment.id}
                              onClick={() => pickSegment(segment, lane)}
                              onMouseEnter={(event) => showHoverTooltip(event, segment, lane)}
                              onMouseMove={(event) => showHoverTooltip(event, segment, lane)}
                              onMouseLeave={hideHoverTooltip}
                              style={{ cursor: 'pointer' }}
                            >
                              {isAutoTimeoutMarker ? (
                                <polygon points={buildAsteriskPoints(cx, cy)} fill={color}>
                                  <title>{label}</title>
                                </polygon>
                              ) : (
                                <rect x={cx - 5} y={cy - 5} width="10" height="10" transform={`rotate(45 ${cx} ${cy})`} fill={color}>
                                  <title>{label}</title>
                                </rect>
                              )}
                            </g>
                          );
                        }

                        return (
                          <rect
                            key={segment.id}
                            x={x1}
                            y={y + 4}
                            width={barWidth}
                            height={rowHeight - 8}
                            rx="6"
                            fill={color}
                            stroke={isUpload ? '#4C1D95' : 'none'}
                            strokeWidth={isUpload ? '1' : '0'}
                            opacity={barOpacity}
                            onClick={() => pickSegment(segment, lane)}
                            onMouseEnter={(event) => showHoverTooltip(event, segment, lane)}
                            onMouseMove={(event) => showHoverTooltip(event, segment, lane)}
                            onMouseLeave={hideHoverTooltip}
                            style={{ cursor: 'pointer' }}
                          >
                            <title>{label}</title>
                          </rect>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
      {hoveredSegment ? (
        <div
          className="pointer-events-none absolute z-20 w-[310px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_16px_32px_-20px_rgba(15,23,42,0.65)]"
          style={{ left: `${hoveredSegment.x}px`, top: `${hoveredSegment.y}px` }}
        >
          <div className="text-[11px] font-semibold text-slate-800">
            {toGanttSegmentTypeLabel(hoveredSegment.segmentType)} ({hoveredSegment.segmentType})
          </div>
          <div className="mt-0.5 text-[11px] text-slate-600">Group: {hoveredSegment.groupLabel || '-'}</div>
          <div className="mt-1 text-[11px] text-slate-600">Lane: {hoveredSegment.lane || '-'}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">Start: {toDisplayDate(hoveredSegment.start)}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">End: {toDisplayDate(hoveredSegment.end)}</div>
          <div className="mt-0.5 text-[11px] text-slate-600">Duration: {formatDuration(hoveredSegment.durationSeconds)}</div>
        </div>
      ) : null}

    </div>
  );
};

const DurationBarChart = ({ rows, maxVisibleRows = 0 }) => {
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
};

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

const DonutWorkloadChart = ({ rows, expanded = false }) => {
  const [focusedUser, setFocusedUser] = useState('');
  const totalSeconds = rows.reduce((sum, row) => sum + safeNumber(row.totalSeconds), 0);
  if (totalSeconds <= 0) return null;

  let startRatio = 0;
  const segments = rows
    .map((row, idx) => {
      const value = safeNumber(row.totalSeconds);
      if (value <= 0) return null;
      const fraction = value / totalSeconds;
      const segment = {
        user: row.user || `User ${idx + 1}`,
        value,
        fraction,
        startRatio,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
      };
      startRatio += fraction;
      return segment;
    })
    .filter(Boolean);

  const focusedSegment = focusedUser ? segments.find((segment) => segment.user === focusedUser) || null : null;
  const hasFocus = Boolean(focusedSegment);
  const legendSegments = focusedSegment ? [focusedSegment] : segments;

  useEffect(() => {
    if (!focusedUser) return;
    if (!segments.some((segment) => segment.user === focusedUser)) {
      setFocusedUser('');
    }
  }, [segments, focusedUser]);

  const size = expanded ? 440 : 220;
  const center = size / 2;
  const radius = expanded ? 150 : 70;
  const stroke = expanded ? 56 : 28;
  const circumference = 2 * Math.PI * radius;
  const focusLabel = focusedSegment
    ? (focusedSegment.user.length > (expanded ? 24 : 14) ? `${focusedSegment.user.slice(0, expanded ? 24 : 14)}...` : focusedSegment.user)
    : '';

  const showFocus = (segment) => {
    setFocusedUser(segment.user);
  };

  const clearFocus = () => {
    setFocusedUser('');
  };

  return (
    <div className={`mt-4 grid grid-cols-1 ${expanded ? 'xl:grid-cols-[460px_360px] justify-center gap-8 items-start' : 'lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] gap-4 items-start'}`}>
      <div
        onMouseLeave={clearFocus}
        className={`mx-auto relative ${expanded ? 'w-[440px]' : 'w-[210px] xl:w-[220px]'}`}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto">
          <circle cx={center} cy={center} r={radius} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
          <g transform={`rotate(-90 ${center} ${center})`}>
            {segments.map((segment) => {
              const isFocused = focusedSegment?.user === segment.user;
              return (
                <circle
                  key={segment.user}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={hasFocus && !isFocused ? '#CBD5E1' : segment.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${segment.fraction * circumference} ${circumference}`}
                  strokeDashoffset={-segment.startRatio * circumference}
                  strokeLinecap="round"
                  opacity={hasFocus && !isFocused ? 0.4 : 1}
                  style={{ cursor: 'pointer', transition: 'all 160ms ease' }}
                  onMouseEnter={() => showFocus(segment)}
                />
              );
            })}
          </g>
          <text x={center} y={center - 4} textAnchor="middle" className={`fill-slate-900 font-bold ${expanded ? 'text-[18px]' : 'text-[16px]'}`}>
            {formatDuration(focusedSegment ? focusedSegment.value : totalSeconds)}
          </text>
          {focusedSegment ? (
            <>
              <text x={center} y={center + 16} textAnchor="middle" className={`fill-slate-500 ${expanded ? 'text-[12px]' : 'text-[11px]'}`}>
                {formatPercent(focusedSegment.fraction)}
              </text>
              <text x={center} y={center + 30} textAnchor="middle" className={`fill-slate-500 ${expanded ? 'text-[11px]' : 'text-[10px]'}`}>
                {focusLabel}
              </text>
            </>
          ) : (
            <text x={center} y={center + 16} textAnchor="middle" className={`fill-slate-500 ${expanded ? 'text-[12px]' : 'text-[11px]'}`}>
              Active Time
            </text>
          )}
        </svg>
      </div>

      <div className={`space-y-2 min-w-0 w-full ${expanded ? 'max-w-[360px] mx-auto max-h-[62vh] overflow-y-auto no-scrollbar pr-1' : 'max-h-[260px] lg:max-h-[300px] overflow-y-auto no-scrollbar pr-1'}`}>
        {legendSegments.map((segment) => (
          <div key={segment.user} className={`flex items-center justify-between gap-3 rounded-lg border ${focusedSegment ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'} ${expanded ? 'px-3 py-2.5' : 'px-3 py-2'}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: segment.color }}></span>
              <span className={`font-medium text-slate-700 truncate ${expanded ? 'text-sm max-w-[220px]' : 'text-sm'}`} title={segment.user}>{segment.user}</span>
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap" title={`${segment.user}: ${formatDuration(segment.value)}`}>
              {expanded ? `${formatPercent(segment.fraction)} | ${formatDuration(segment.value)}` : formatPercent(segment.fraction)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserContributionStackChart = ({ rows, maxVisibleRows = 0 }) => {
  const prepared = rows
    .map((row) => {
      const review = safeNumber(row.reviewSeconds);
      const edit = safeNumber(row.editSeconds);
      const complete = safeNumber(row.completeSeconds);
      const total = review + edit + complete;
      return {
        user: row.user || 'Unknown User',
        review,
        edit,
        complete,
        total,
        reworkRate: safeNumber(row.reworkRate),
      };
    })
    .filter((row) => row.total > 0);

  if (prepared.length === 0) return null;
  const maxTotal = prepared.reduce((max, row) => Math.max(max, row.total), 0) || 1;

  const rowSlotHeight = 110;
  const useScroll = maxVisibleRows > 0 && prepared.length > maxVisibleRows;
  const wrapperStyle = useScroll ? { maxHeight: `${maxVisibleRows * rowSlotHeight}px` } : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <div className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>Review</div>
        <div className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Edit</div>
        <div className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-500"></span>Complete</div>
      </div>
      <div className={`${useScroll ? 'overflow-y-auto no-scrollbar pr-2 pb-2 space-y-3' : 'space-y-3'}`} style={wrapperStyle}>
        {prepared.map((row) => {
          const totalWidth = clampPercent(Math.max((row.total / maxTotal) * 100, 8));
          const reviewWidth = row.total > 0 ? clampPercent((row.review / row.total) * 100) : 0;
          const editWidth = row.total > 0 ? clampPercent((row.edit / row.total) * 100) : 0;
          const completeWidth = row.total > 0 ? clampPercent((row.complete / row.total) * 100) : 0;

          return (
            <div key={row.user} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-slate-800 truncate">{row.user}</span>
                <span className="text-slate-500">{formatDuration(row.total)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full overflow-hidden flex" style={{ width: `${totalWidth}%` }}>
                  <div className="h-full bg-blue-600" style={{ width: `${reviewWidth}%` }}></div>
                  <div className="h-full bg-emerald-500" style={{ width: `${editWidth}%` }}></div>
                  <div className="h-full bg-violet-500" style={{ width: `${completeWidth}%` }}></div>
                </div>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Review {formatDuration(row.review)} | Edit {formatDuration(row.edit)} | Complete {formatDuration(row.complete)} | Edit Rate {formatPercent(row.reworkRate)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ReworkMatrixScatterChart = ({ rows, expanded = false }) => {
  const prepared = rows
    .slice(0, 8)
    .map((row, idx) => ({
      user: row.user || `User ${idx + 1}`,
      avgTimePerDocSeconds: safeNumber(row.avgTimePerDocSeconds),
      reworkRate: Math.max(0, Math.min(1, safeNumber(row.reworkRate))),
      autoClosedRate: Math.max(0, Math.min(1, safeNumber(row.autoClosedRate))),
      totalActiveSeconds: safeNumber(row.totalActiveSeconds),
    }))
    .filter((row) => row.avgTimePerDocSeconds > 0 || row.reworkRate > 0 || row.totalActiveSeconds > 0);

  if (prepared.length === 0) return null;

  const maxX = prepared.reduce((max, row) => Math.max(max, row.avgTimePerDocSeconds), 0) || 1;
  const maxActive = prepared.reduce((max, row) => Math.max(max, row.totalActiveSeconds), 0) || 1;

  const width = expanded ? 760 : 520;
  const height = expanded ? 350 : 260;
  const margin = expanded
    ? { top: 18, right: 26, bottom: 46, left: 56 }
    : { top: 16, right: 18, bottom: 42, left: 44 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  // Add right-side headroom so the max bubble and label don't get pinned to the chart edge.
  const xDomainMax = Math.max(1, maxX * 1.08);
  const x = (v) => margin.left + (safeNumber(v) / xDomainMax) * innerWidth;
  const y = (v) => margin.top + (1 - Math.max(0, Math.min(1, safeNumber(v)))) * innerHeight;
  const bubbleRadius = (active) => {
    const base = expanded ? 7 : 5;
    const span = expanded ? 11 : 8;
    return base + Math.sqrt(Math.max(0, active) / maxActive) * span;
  };

  return (
    <div className={`mt-2 overflow-hidden ${expanded ? 'w-full max-w-[820px] mx-auto px-1' : ''}`}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto rounded-xl border border-slate-100 bg-white block" style={{ overflow: 'hidden' }}>
        {ticks.map((tick) => (
          <line
            key={`h-${tick}`}
            x1={margin.left}
            x2={width - margin.right}
            y1={y(tick)}
            y2={y(tick)}
            stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
            strokeDasharray={tick === 0 ? '0' : '3 3'}
          />
        ))}
        {ticks.map((tick) => (
          <line
            key={`v-${tick}`}
            y1={margin.top}
            y2={height - margin.bottom}
            x1={margin.left + tick * innerWidth}
            x2={margin.left + tick * innerWidth}
            stroke={tick === 0 ? '#94A3B8' : '#E2E8F0'}
            strokeDasharray={tick === 0 ? '0' : '3 3'}
          />
        ))}

        {ticks.map((tick) => (
          <text key={`yt-${tick}`} x={margin.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-slate-500 text-[10px]">
            {Math.round(tick * 100)}%
          </text>
        ))}
        {ticks.map((tick) => (
          <text key={`xt-${tick}`} x={margin.left + tick * innerWidth} y={height - 16} textAnchor="middle" className="fill-slate-500 text-[10px]">
            {formatDuration(xDomainMax * tick)}
          </text>
        ))}

        {prepared.map((row, idx) => {
          const px = x(row.avgTimePerDocSeconds);
          const py = y(row.reworkRate);
          const pointRadius = bubbleRadius(row.totalActiveSeconds);
          const color = CHART_PALETTE[idx % CHART_PALETTE.length];
          const shortUserLabel = row.user.length > 14 ? `${row.user.slice(0, 14)}...` : row.user;
          const labelX = Math.max(margin.left + 8, Math.min(width - margin.right - 8, px));
          const labelAnchor = 'middle';
          const labelY = Math.max(margin.top + 12, py - pointRadius - 8);
          return (
            <g key={row.user}>
              <circle cx={px} cy={py} r={pointRadius} fill={color} opacity="0.8" stroke="#ffffff" strokeWidth="2">
                <title>{`${row.user} | Avg/Doc ${formatDuration(row.avgTimePerDocSeconds)} | Edit ${formatPercent(row.reworkRate)} | Auto Closed ${formatPercent(row.autoClosedRate)}`}</title>
              </circle>
              <text x={labelX} y={labelY} textAnchor={labelAnchor} className="fill-slate-700 text-[10px] font-medium">
                {shortUserLabel}
              </text>
            </g>
          );
        })}

        <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">
          Avg Time per Document
        </text>
        <text transform={`translate(14 ${height / 2}) rotate(-90)`} textAnchor="middle" className="fill-slate-500 text-[11px]">
          Edit Rate
        </text>
      </svg>
    </div>
  );
};

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
      setGsheetSuccess('เชื่อมต่อสำเร็จ! ข้อมูลจะ sync อัตโนมัติทุกครั้งที่เปิดหน้าเว็บ');
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
    <div className="max-w-[1200px] mx-auto space-y-6 animate-in fade-in duration-300">
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.xlsx,.xlsm,.xls"
      />

      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Data Management</h1>
          <p className="text-slate-500 mt-1">Upload Excel/CSV แล้วรวมข้อมูลลงตารางกลางเดียวใน SQLite พร้อมเก็บชื่อไฟล์และชื่อหน้า (Page)</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg flex items-center justify-between">
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
          className={`border-2 border-dashed rounded-2xl p-8 min-h-[270px] flex flex-col items-center justify-center text-center transition-all cursor-pointer group shadow-sm ${uploading ? 'border-slate-200 bg-slate-50 cursor-not-allowed' : 'border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300'}`}
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Upload Excel / CSV</h3>
          <button className="mt-6 h-12 px-6 bg-blue-600 text-white text-base font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2 pointer-events-none">
            <Plus className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Select Files'}
          </button>
        </div>

        <div className={`border-2 border-dashed rounded-2xl p-8 min-h-[270px] flex flex-col items-center justify-center text-center shadow-sm transition-all ${gsheetLoading ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300'}`}>
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
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
              className="h-12 flex-1 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={handleGSheetConnect}
              disabled={gsheetLoading || !gsheetUrl.trim()}
              className="h-12 px-5 bg-emerald-600 text-white text-base font-semibold rounded-lg shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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

      {/* Connected Google Sheets */}
      {gsheetConnections.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-600" />
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">Connected Sources</h2>
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
                      {source.rows?.toLocaleString()} rows | {source.pageCount} pages
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Updated: {toDisplayDate(source.date)}</div>
                    {Array.isArray(source.pages) && source.pages.length > 0 && (
                      <div className="text-xs text-slate-400 mt-1">Pages: {source.pages.join(', ')}</div>
                    )}
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
  );
};

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
  const [ganttSingleLaneMode, setGanttSingleLaneMode] = useState(false);
  const [showWorkloadIdle, setShowWorkloadIdle] = useState(false);
  const [showWorkloadSystem, setShowWorkloadSystem] = useState(false);

  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showIdle, setShowIdle] = useState(true);
  const [activeView, setActiveView] = useState('user-performance');
  const [openDropdown, setOpenDropdown] = useState('');
  const [datePreset, setDatePreset] = useState('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [activeDocumentFile, setActiveDocumentFile] = useState('');
  const [documentFileSearch, setDocumentFileSearch] = useState('');
  const [documentSheetSearch, setDocumentSheetSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchText, setUserSearchText] = useState('');
  const [selectedSegmentTypes, setSelectedSegmentTypes] = useState([]);
  const [segmentTypeSearchText, setSegmentTypeSearchText] = useState('');
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

  const userOptions = useMemo(
    () => {
      const names = new Set();
      let hasSystemSegment = false;
      for (const seg of parsedSegments) {
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
    [parsedSegments]
  );

  const segmentTypeOptions = useMemo(
    () => (
      Array.from(new Set(parsedSegments.map((segment) => segment.segmentType)))
        .sort((a, b) => a.localeCompare(b))
        .map((segmentType) => ({ value: segmentType, label: toSegmentTypeLabel(segmentType) }))
    ),
    [parsedSegments]
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
    if (documentTree.length === 0 || !documentTree.some((item) => item.fileName === activeDocumentFile)) {
      if (activeDocumentFile) setActiveDocumentFile('');
    }
  }, [documentTree, activeDocumentFile]);

  useEffect(() => {
    const allFiles = documentTree.map((item) => item.fileName);
    const validFiles = new Set(allFiles);
    setSelectedFiles((prev) => {
      const next = prev.filter((fileName) => validFiles.has(fileName));
      if (!didInitDocumentDefaultRef.current && next.length === 0 && selectedSheets.length === 0 && allFiles.length > 0) {
        didInitDocumentDefaultRef.current = true;
        return allFiles;
      }
      if (!didInitDocumentDefaultRef.current && allFiles.length > 0) {
        didInitDocumentDefaultRef.current = true;
      }
      return next.length === prev.length ? prev : next;
    });
    const validSheets = new Set(
      documentTree.flatMap((item) => item.sheets.map((sheet) => buildSheetKey(item.fileName, sheet)))
    );
    setSelectedSheets((prev) => {
      const next = prev.filter((sheetKey) => validSheets.has(sheetKey));
      return next.length === prev.length ? prev : next;
    });
  }, [documentTree, selectedSheets.length]);

  useEffect(() => {
    const validFiles = new Set(documentTree.map((item) => item.fileName));
    if (validFiles.size === 0) return;
    if (activeDocumentFile && validFiles.has(activeDocumentFile)) return;

    const firstSelected = selectedFiles.find((fileName) => validFiles.has(fileName));
    if (firstSelected) {
      setActiveDocumentFile(firstSelected);
      return;
    }
    setActiveDocumentFile(documentTree[0].fileName);
  }, [documentTree, selectedFiles, activeDocumentFile]);

  useEffect(() => {
    const userSet = new Set(userOptions);
    setSelectedUsers((prev) => {
      const next = prev.filter((userName) => userSet.has(userName));
      return next.length === prev.length ? prev : next;
    });
  }, [userOptions]);

  useEffect(() => {
    const segmentSet = new Set(segmentTypeOptions.map((option) => option.value));
    setSelectedSegmentTypes((prev) => {
      const next = prev.filter((segmentType) => segmentSet.has(segmentType));
      return next.length === prev.length ? prev : next;
    });
  }, [segmentTypeOptions]);

  const explicitSelectedFileSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);
  const selectedSheetSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);
  const sheetSelectedFileSet = useMemo(
    () => new Set(selectedSheets.map((sheetKey) => extractFileNameFromSheetKey(sheetKey)).filter(Boolean)),
    [selectedSheets]
  );
  const effectiveSelectedFileSet = useMemo(() => {
    const merged = new Set(selectedFiles);
    sheetSelectedFileSet.forEach((fileName) => merged.add(fileName));
    return merged;
  }, [selectedFiles, sheetSelectedFileSet]);
  const selectedUserSet = useMemo(() => new Set(selectedUsers), [selectedUsers]);
  const selectedSegmentTypeSet = useMemo(() => new Set(selectedSegmentTypes), [selectedSegmentTypes]);

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
          // SYSTEM_, IDLE_, REOPEN_MARKER, AUTO_TIMEOUT_MARKER, etc. → treat as "System"
          if (!selectedUserSet.has('System')) return false;
        }
      }
      return true;
    });
  }, [parsedSegments, dateRangeBounds, explicitSelectedFileSet, selectedSheetSet, selectedUserSet]);

  const ganttVisibleSegments = useMemo(() => (
    filteredBaseSegments.filter((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!showIdle && isIdleContextSegment(segmentType)) return false;
      if (selectedSegmentTypeSet.size > 0 && !selectedSegmentTypeSet.has(segmentType)) {
        return isSystemContextSegment(segmentType);
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
  const visibleSystemSegmentCount = useMemo(
    () => ganttVisibleSegments.filter((segment) => String(segment.segmentType || '').startsWith('SYSTEM_')).length,
    [ganttVisibleSegments]
  );
  const visibleProcessingSegmentCount = useMemo(
    () => ganttVisibleSegments.filter((segment) => String(segment.segmentType || '') === 'SYSTEM_INITIAL_PROCESSING').length,
    [ganttVisibleSegments]
  );

  const dateFilterSummary = useMemo(() => {
    if (datePreset !== 'custom') return datePresetLabelMap[datePreset] || 'All Time';
    if (!dateStart && !dateEnd) return 'ยังไม่ได้ตั้ง';
    return `${dateStart || '...'} - ${dateEnd || '...'}`;
  }, [datePreset, dateStart, dateEnd, datePresetLabelMap]);

  const documentFilterSummary = useMemo(() => {
    if (effectiveSelectedFileSet.size === 0 && selectedSheets.length === 0) return 'No Document';
    if (selectedSheets.length > 0) return `${selectedSheets.length} Sheets`;
    if (effectiveSelectedFileSet.size > 0) return `${effectiveSelectedFileSet.size} Files`;
    return `${selectedSheets.length} Sheets`;
  }, [effectiveSelectedFileSet, selectedSheets]);

  const userFilterSummary = useMemo(
    () => (selectedUsers.length === 0 ? 'All Users' : `${selectedUsers.length} Users`),
    [selectedUsers]
  );

  const segmentTypeFilterSummary = useMemo(
    () => (selectedSegmentTypes.length === 0 ? 'Segment Type' : `${selectedSegmentTypes.length} Types`),
    [selectedSegmentTypes]
  );

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
    const nextSheets = selectedSheetSet.has(sheetKey)
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

  const flowRows = useMemo(() => {
    // --- Group by document to follow full workflow path end-to-end ---
    const groupedByDocument = new Map();
    filteredBaseSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      if (!WORKFLOW_FLOW_SEGMENT_TYPES.has(segmentType)) return;
      const documentKey = String(segment.documentId || segment.sheetKey || `${segment.fileName || ''}::${segment.pageName || ''}`);
      if (!groupedByDocument.has(documentKey)) groupedByDocument.set(documentKey, []);
      groupedByDocument.get(documentKey).push(segment);
    });

    const REVIEW_OR_EDIT_TYPES = new Set([
      'USER_REVIEW_COMMENT_CHECK',
      'USER_EDITING_CORRECTION',
      'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL',
    ]);
    const REVIEW_EDIT_OR_COMPLETE_TYPES = new Set([
      'USER_REVIEW_COMMENT_CHECK',
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

    const addMetric = (metricId, seconds, { capSeconds = FLOW_SESSION_GAP_MAX_SECONDS } = {}) => {
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

        // 1) Processing round 1 -> first user review/edit
        if (currentType === 'SYSTEM_INITIAL_PROCESSING') {
          const nextUserIdx = sorted.findIndex((candidate, candidateIdx) => (
            candidateIdx > idx && REVIEW_OR_EDIT_TYPES.has(String(candidate.segmentType || ''))
          ));
          if (nextUserIdx > idx) {
            const next = sorted[nextUserIdx];
            addMetric(
              'processing-round-1-to-user',
              (safeNumber(next.startTs) - safeNumber(current.endTs)) / 1000
            );
          }
        }

        // 2) User review/edit -> next user review/edit/complete
        if (REVIEW_OR_EDIT_TYPES.has(currentType)) {
          const nextUserStepIdx = sorted.findIndex((candidate, candidateIdx) => (
            candidateIdx > idx && REVIEW_EDIT_OR_COMPLETE_TYPES.has(String(candidate.segmentType || ''))
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

      // 4) Processing round 2 -> first user review/edit
      // Backend emits SYSTEM_SCHEDULED_REPROCESSING for every cycle, so round-2 is the 2nd occurrence.
      // Fallback: if round-2 marker is not explicit, use idle-after-reprocess style segments after a reprocess.
      let round2AnchorIdx = reprocessIndices.length >= 2 ? reprocessIndices[1] : -1;
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
          candidateIdx > round2AnchorIdx && REVIEW_OR_EDIT_TYPES.has(String(candidate.segmentType || ''))
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

      // 3) Upload -> latest complete (end-to-end, no 2h cap)
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

    // --- Aggregate transitions into groups ---
    const groupStats = FLOW_INSIGHT_GROUPS.map((group) => {
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

    return groupStats;
  }, [filteredBaseSegments]);

  const flowTopRows = useMemo(() => flowRows, [flowRows]);

  useEffect(() => {
    setSelectedGanttSegment(null);
  }, [datePreset, dateStart, dateEnd, selectedFiles, selectedSheets, selectedUsers, selectedSegmentTypes, showIdle]);

  useEffect(() => {
    setOpenDropdown('');
  }, [activeView]);

  useEffect(() => {
    setExpandedVisualizationId('');
  }, [activeView]);

  useEffect(() => {
    // Ensure donut idle toggle starts disabled on initial load.
    setShowWorkloadIdle(false);
  }, []);

  const workloadContributors = useMemo(() => {
    const laneDurationMap = new Map();
    ganttVisibleSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      const durationSeconds = safeNumber(segment.durationSeconds);
      if (durationSeconds <= 0) return;

      let lane = toTimelineLane(segmentType, segment.userName);
      if (segmentType.startsWith('SYSTEM_')) lane = 'System';
      if (isIdleContextSegment(segmentType)) lane = 'Idle';
      // Keep donut idle aligned with "Idle Waiting for User" KPI (explicit IDLE_* only).
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
            title="ยังไม่มี Segment Data"
            subtitle="อัปโหลดไฟล์ Audit Log เพื่อคำนวณ Gantt segment"
          />
        );
      }
      return (
        <GanttTimelineChart
          segments={ganttVisibleSegments}
          onSelectSegment={setSelectedGanttSegment}
          expanded
          singleLane={ganttSingleLaneMode}
        />
      );
    }

    if (expandedVisualizationId === 'donut') {
      if (workloadContributors.length === 0) {
        return (
          <EmptyState
            icon={Users}
            title="ยังไม่มี Contribution Data"
            subtitle="ยังไม่มี Active Time จากข้อมูลที่อัปโหลด"
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
            title="ยังไม่มี Ranking Data"
            subtitle="ระบบยังไม่พบ session ผู้ใช้ที่คำนวณได้"
          />
        );
      }
      return <UserContributionStackChart rows={contributionRows} maxVisibleRows={12} />;
    }

    if (expandedVisualizationId === 'flow') {
      if (flowTopRows.length === 0) {
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
          rows={flowTopRows.map((row) => ({
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
            title="ยังไม่มี Matrix Data"
            subtitle="ยังไม่พบข้อมูลสำหรับคำนวณ Edit Matrix"
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
      // 1. Sync all connected Google Sheets first (pull latest data)
      setSyncing(true);
      const syncRes = await requestJson('/api/gsheet/sync', { method: 'POST' }).catch((e) => ({ __error: e.message }));
      setSyncing(false);
      if (syncRes && !syncRes.__error && syncRes.connections) {
        setGsheetConnections(syncRes.connections || []);
      }

      // 2. Load all dashboard data
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
          setBackendWarning(
            'Backend ที่รันอยู่ไม่มี version metadata (น่าจะเป็น process เก่า). ให้ปิด server ทั้งหมดแล้วรัน ./start.ps1 ใหม่'
          );
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
              summary={dateFilterSummary}
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
                  <div className="text-[11px] font-medium text-slate-500">{datePreset === 'custom' && hasCustomDateInput ? 'ตั้งค่าแล้ว (Custom)' : 'ยังไม่ได้ตั้ง'}</div>
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
              summary={documentFilterSummary}
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
                          const checked = effectiveSelectedFileSet.has(item.fileName);
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
                            if (nextSheets.length === 0) {
                              setSelectedFiles(allDocumentFiles);
                            }
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

                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <div className="text-xs text-slate-500">Tip: เลือกได้หลายไฟล์และหลายชีตพร้อมกัน</div>
                  <button
                    onClick={() => {
                      setSelectedFiles([]);
                      setSelectedSheets([]);
                      setDocumentFileSearch('');
                      setDocumentSheetSearch('');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Reset Document Filter
                  </button>
                </div>
              </div>
            </FilterPopover>

            <FilterPopover
              id="user"
              title="User"
              summary={userFilterSummary}
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
              summary={segmentTypeFilterSummary}
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
                      <label key={option.value} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSegmentTypeSet.has(option.value)}
                          onChange={() => toggleSegmentTypeSelection(option.value)}
                          className="mt-0.5 h-4 w-4 accent-blue-600 rounded"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{option.label}</div>
                          <div className="text-[11px] text-slate-400 truncate">{option.value}</div>
                        </div>
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
                title="Refresh all dashboard data"
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
          {backendWarning && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {backendWarning}
            </div>
          )}

          {(suspiciousZeroState || showDebugPanel) && activeView === 'user-performance' && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${suspiciousZeroState ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold">
                  {suspiciousZeroState ? 'Debug Warning: มีข้อมูลใน DB แต่ KPI ยังเป็น 0' : 'Debug Panel'}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const next = !showDebugPanel;
                      setShowDebugPanel(next);
                      if (next) {
                        refreshAll({ includeDebug: true });
                      }
                    }}
                    className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50"
                  >
                    {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
                  </button>
                  <button
                    onClick={refreshAll}
                    className="px-2 py-1 rounded border border-slate-300 text-xs hover:bg-slate-50"
                  >
                    Refresh Debug
                  </button>
                </div>
              </div>
              {showDebugPanel && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div>Frontend Build: {FRONTEND_BUILD_VERSION}</div>
                  <div>Debug Endpoint Error: {debugFetchError || '-'}</div>
                  <div>Version: {healthInfo?.version || debugInfo?.version || '-'}</div>
                  <div>Process ID: {healthInfo?.processId || debugInfo?.processId || '-'}</div>
                  <div>Server Started: {healthInfo?.serverStartedAt || debugInfo?.serverStartedAt || '-'}</div>
                  <div>App File Mtime: {healthInfo?.appFileMtime || '-'}</div>
                  <div>DB Rows: {debugInfo?.dbSummary?.rows ?? '-'}</div>
                  <div>Unified Rows: {debugInfo?.dbSummary?.unifiedRows ?? '-'}</div>
                  <div>Rows with Event Time: {debugInfo?.parseStats?.rowsWithEventTime ?? '-'}</div>
                  <div>Spread Status Rows: {debugInfo?.parseStats?.rowsWithSpreadStatusChangeType ?? '-'}</div>
                  <div>Workflow To Rows: {debugInfo?.parseStats?.rowsWithWorkflowStatusTo ?? '-'}</div>
                  <div>Normalized Events: {debugInfo?.parseStats?.normalizedEvents ?? '-'}</div>
                  <div>Normalized Events with ToStatus: {debugInfo?.parseStats?.normalizedEventsWithToStatus ?? '-'}</div>
                  <div>Active User Seconds: {performance?.kpis?.activeUserTimeSeconds ?? '-'}</div>
                  <div>Visible System Segments: {visibleSystemSegmentCount}</div>
                  <div>Visible Processing Segments: {visibleProcessingSegmentCount}</div>
                </div>
              )}
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
              <div className="flex justify-between items-end mb-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">User Performance</h1>

                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
                {kpiData.map((kpi, idx) => (
                  <div
                    key={kpi.id}
                    className={`card-rise-in bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] ${loading ? 'opacity-70' : ''}`}
                    style={{ animationDelay: `${idx * 45}ms` }}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                        <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                      </div>
                    </div>
                    <div className="text-slate-500 text-sm font-semibold mb-1">{kpi.label}</div>
                    <div className="text-[2rem] sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{kpi.value}</div>
                    <div className="text-xs text-slate-400 mt-2 font-medium leading-snug break-words" title={kpi.subtext}>{kpi.subtext}</div>
                  </div>
                ))}
              </div>

              <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 overflow-hidden" style={{ animationDelay: '220ms' }}>
                <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
                  <button
                    onClick={exportTimelineExcel}
                    disabled={ganttVisibleSegments.length === 0}
                    className="h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-400 disabled:hover:border-slate-200"
                    title="Export timeline to Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <button
                    onClick={() => setGanttSingleLaneMode((prev) => !prev)}
                    className={`h-7 w-7 rounded-md border transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${
                      ganttSingleLaneMode
                        ? 'border-blue-200 bg-blue-50/90 text-blue-600'
                        : 'border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                    }`}
                    title="Toggle single-lane timeline (All user)"
                    aria-pressed={ganttSingleLaneMode}
                  >
                    <Users className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <button
                    onClick={() => setExpandedVisualizationId('gantt')}
                    className="h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                    title="Expand visualization"
                  >
                    <Maximize2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                </div>
                <div className="flex justify-between items-center mb-6 pr-8">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Timeline by User</h2>
                  </div>
                </div>
                  <div className="space-y-2">
                    {ganttVisibleSegments.length === 0 ? (
                      <EmptyState
                        icon={LayoutDashboard}
                        title="ยังไม่มี Segment Data"
                        subtitle="อัปโหลดไฟล์ Audit Log เพื่อคำนวณ Gantt segment"
                      />
                    ) : (
                      <GanttTimelineChart
                        segments={ganttVisibleSegments}
                        onSelectSegment={setSelectedGanttSegment}
                        singleLane={ganttSingleLaneMode}
                      />
                    )}
                  </div>
                </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 flex flex-col lg:h-[430px] lg:col-span-2" style={{ animationDelay: '260ms' }}>
                  <div className="absolute right-4 top-4 z-10 flex items-center gap-1">
                    <button
                      onClick={() => setShowWorkloadIdle((prev) => !prev)}
                      className={`h-7 rounded-md border px-2 text-[11px] font-semibold transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${
                        showWorkloadIdle
                          ? 'border-blue-200 bg-blue-50/90 text-blue-600'
                          : 'border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                      }`}
                      title="Toggle idle time in donut"
                      aria-pressed={showWorkloadIdle}
                    >
                      Idle Time
                    </button>
                    <button
                      onClick={() => setShowWorkloadSystem((prev) => !prev)}
                      className={`h-7 rounded-md border px-2 text-[11px] font-semibold transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 ${
                        showWorkloadSystem
                          ? 'border-blue-200 bg-blue-50/90 text-blue-600'
                          : 'border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                      }`}
                      title="Toggle system time in donut"
                      aria-pressed={showWorkloadSystem}
                    >
                      System Time
                    </button>
                    <button
                      onClick={() => setExpandedVisualizationId('donut')}
                      className="h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100"
                      title="Expand visualization"
                    >
                      <Maximize2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Workload Share by User</h2>
                    <p className="text-sm text-slate-500">Active-time share of all contributors</p>
                  </div>
                  <div className="mt-4 flex-1 min-h-0">
                    {workloadContributors.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        title="ยังไม่มี Contribution Data"
                        subtitle="ยังไม่มี Active Time จากข้อมูลที่อัปโหลด"
                      />
                    ) : (
                      <DonutWorkloadChart rows={workloadContributors} />
                    )}
                  </div>
                </div>

                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 lg:col-span-3 flex flex-col lg:h-[430px] overflow-hidden" style={{ animationDelay: '300ms' }}>
                  <button
                    onClick={() => setExpandedVisualizationId('contribution')}
                    className="absolute right-4 top-4 z-10 h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    title="Expand visualization"
                  >
                    <Maximize2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <div className="mb-4 pr-8">
                    <h2 className="text-lg font-bold text-slate-900">Top User Work Mix</h2>
                    <p className="text-sm text-slate-500">Compare Review / Edit / Complete time by user</p>
                  </div>
                  <div className="space-y-2 flex-1 min-h-0 overflow-hidden pt-1">
                    {contributionRows.length === 0 ? (
                      <EmptyState
                        icon={Users}
                        title="ยังไม่มี Ranking Data"
                        subtitle="ระบบยังไม่พบ session ผู้ใช้ที่คำนวณได้"
                      />
                    ) : (
                      <UserContributionStackChart rows={contributionRows} maxVisibleRows={3} />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 pb-8 sm:pb-10">
                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 flex flex-col lg:min-h-[420px] overflow-hidden" style={{ animationDelay: '340ms' }}>
                  <button
                    onClick={() => setExpandedVisualizationId('flow')}
                    className="absolute right-4 top-4 z-10 h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    title="Expand visualization"
                  >
                    <Maximize2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <div className="mb-4 pr-8">
                    <h2 className="text-lg font-bold text-slate-900">Step Delay Analysis</h2>
                    <p className="text-sm text-slate-500">4 key workflow delays</p>
                  </div>
                  <div className="space-y-2 flex-1 min-h-0 overflow-hidden">
                    {flowTopRows.length === 0 ? (
                      <EmptyState
                        icon={RefreshCw}
                        title="No Flow Data"
                        subtitle="No valid transition delays found from current filters"
                      />
                    ) : (
                        <DurationBarChart
                          rows={flowTopRows.map((row) => ({
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
                    )}
                  </div>
                </div>

                <div className="group relative card-rise-in bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] p-4 sm:p-6 flex flex-col lg:min-h-[420px] overflow-hidden" style={{ animationDelay: '380ms' }}>
                  <button
                    onClick={() => setExpandedVisualizationId('matrix')}
                    className="absolute right-4 top-4 z-10 h-7 w-7 rounded-md border border-slate-200 bg-white/85 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                    title="Expand visualization"
                  >
                    <Maximize2 className="w-3.5 h-3.5 mx-auto" />
                  </button>
                  <div className="mb-4 pr-8">
                    <h2 className="text-lg font-bold text-slate-900">Quality vs Edit by User</h2>
                    <p className="text-sm text-slate-500">Avg time per document versus edit rate</p>
                  </div>
                  <div className="space-y-2 flex-1 min-h-0">
                    {matrixRows.length === 0 ? (
                      <EmptyState
                        icon={Search}
                        title="ยังไม่มี Matrix Data"
                        subtitle="ยังไม่พบข้อมูลสำหรับคำนวณ Edit Matrix"
                      />
                    ) : (
                      <ReworkMatrixScatterChart rows={matrixRows} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {expandedVisualizationId ? (
            <div
              className="fixed inset-0 z-[45] flex items-center justify-center p-3 md:p-6 bg-slate-900/35 backdrop-blur-[1px] viz-overlay-enter"
              onClick={() => setExpandedVisualizationId('')}
            >
              <div
                className="w-full max-w-[1800px] h-[94vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden viz-panel-enter"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-slate-900">
                      {visualizationMeta[expandedVisualizationId]?.title || 'Visualization'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {visualizationMeta[expandedVisualizationId]?.subtitle || ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {expandedVisualizationId === 'gantt' ? (
                      <button
                        onClick={exportTimelineExcel}
                        disabled={ganttVisibleSegments.length === 0}
                        className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title="Export timeline to Excel"
                      >
                        <FileSpreadsheet className="w-4 h-4 mx-auto" />
                      </button>
                    ) : null}
                    {expandedVisualizationId === 'gantt' ? (
                      <button
                        onClick={() => setGanttSingleLaneMode((prev) => !prev)}
                        className={`h-9 w-9 rounded-lg border transition-colors ${
                          ganttSingleLaneMode
                            ? 'border-blue-200 bg-blue-50 text-blue-600'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        title="Toggle single-lane timeline (All user)"
                        aria-pressed={ganttSingleLaneMode}
                      >
                        <Users className="w-4 h-4 mx-auto" />
                      </button>
                    ) : null}
                    {expandedVisualizationId === 'donut' ? (
                      <button
                        onClick={() => setShowWorkloadIdle((prev) => !prev)}
                        className={`h-9 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                          showWorkloadIdle
                            ? 'border-blue-200 bg-blue-50 text-blue-600'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        title="Toggle idle time in donut"
                        aria-pressed={showWorkloadIdle}
                      >
                        Idle Time
                      </button>
                    ) : null}
                    {expandedVisualizationId === 'donut' ? (
                      <button
                        onClick={() => setShowWorkloadSystem((prev) => !prev)}
                        className={`h-9 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                          showWorkloadSystem
                            ? 'border-blue-200 bg-blue-50 text-blue-600'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        title="Toggle system time in donut"
                        aria-pressed={showWorkloadSystem}
                      >
                        System Time
                      </button>
                    ) : null}
                    <button
                      onClick={() => setExpandedVisualizationId('')}
                      className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      title="Close expanded view"
                    >
                      <X className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
                <div className="p-5 md:p-6 overflow-auto no-scrollbar flex-1">
                  {renderExpandedVisualization()}
                </div>
              </div>
            </div>
          ) : null}

          {selectedGanttSegment && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm"
              onClick={() => setSelectedGanttSegment(null)}
            >
              <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">Segment Details</div>
                    <div className="text-xs text-slate-500">Clicked from Gantt Timeline</div>
                  </div>
                  <button
                    onClick={() => setSelectedGanttSegment(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
                <div className="p-6 space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Lane:</span> <span className="font-medium text-slate-800">{selectedGanttSegment.lane || '-'}</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Segment Type:</span> <span className="font-medium text-slate-800">{toGanttSegmentTypeLabel(selectedGanttSegment.segmentType)} ({selectedGanttSegment.segmentType || '-'})</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Start:</span> <span className="font-medium text-slate-800">{toDisplayDate(selectedGanttSegment.start)}</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">End:</span> <span className="font-medium text-slate-800">{toDisplayDate(selectedGanttSegment.end)}</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Duration:</span> <span className="font-medium text-slate-800">{formatDuration(selectedGanttSegment.durationSeconds)}</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Document:</span> <span className="font-medium text-slate-800">{selectedGanttSegment.documentId || '-'}</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">File:</span> <span className="font-medium text-slate-800">{selectedGanttSegment.fileName || '-'}</span></div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">Page:</span> <span className="font-medium text-slate-800">{selectedGanttSegment.pageName || '-'}</span></div>
                  </div>
                  {selectedGanttSegment.autoTimeout ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                      This segment is marked as Auto Timeout.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const rootNode = document.getElementById('root');
if (!rootNode) {
  throw new Error('Missing #root element in index.html');
}

createRoot(rootNode).render(<App />);
