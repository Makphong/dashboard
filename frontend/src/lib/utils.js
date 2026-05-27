import {
  SEGMENT_TYPE_SHORT_LABELS,
  GANTT_SEGMENT_DISPLAY_LABELS,
  PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES,
  REPROCESSING_SEGMENT_MERGE_GAP_MS,
  initialKpiData,
  CORE_WORK_SESSION_TYPES,
  MARKER_STAR_MIN_GAP_PX
} from './constants.js';
import {
  Clock, Users, Timer, RefreshCw, AlertTriangle
} from 'lucide-react';

export function buildKpiData(kpis) {
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
      subtext: `Med ${kpis.medianSessionDisplay || '-'} · ${kpis.minSessionDisplay || '-'} - ${kpis.maxSessionDisplay || '-'}`,
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

export function buildKpisFromSegments(segments) {
  const safeSegments = Array.isArray(segments) ? segments : [];
  const userSegments = safeSegments.filter((segment) => String(segment.segmentType || '').startsWith('USER_'));
  const coreUserSegments = userSegments.filter((segment) => CORE_WORK_SESSION_TYPES.has(String(segment.segmentType || '')));
  const idleSegments = safeSegments.filter((segment) => isIdleContextSegment(segment.segmentType));
  const processingEquivalentIdleSegments = safeSegments.filter((segment) => isProcessingEquivalentIdleSegment(segment.segmentType));

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
  const reworkSessions = coreUserSegments.filter((segment) => {
    const type = String(segment.segmentType || '');
    return type === 'USER_EDITING_CORRECTION' || type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
  }).length;
  const reworkRate = coreUserSegments.length > 0 ? (reworkSessions / coreUserSegments.length) : 0;

  const processingEquivalentSystemSeconds = processingEquivalentIdleSegments.reduce((sum, segment) => sum + safeNumber(segment.durationSeconds), 0);
  const totalCycleSeconds = activeUserTimeSeconds + idleWaitingSeconds +
    processingEquivalentSystemSeconds +
    safeSegments.filter((s) => String(s.segmentType || '').startsWith('SYSTEM_')).reduce((sum, s) => sum + safeNumber(s.durationSeconds), 0);
  const idlePercentOfCycle = totalCycleSeconds > 0 ? (idleWaitingSeconds / totalCycleSeconds) * 100 : 0;
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

export function toDisplayDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

export function toExcelDateTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())} ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function downloadExcelTable(filename, sheetTitle, columns, rows) {
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

export function formatDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 24 * DAY;
  const YEAR = 12 * MONTH;

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

export function formatPercent(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

export function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

export function percentile(values, ratio) {
  const prepared = (Array.isArray(values) ? values : [])
    .map((value) => safeNumber(value))
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  if (prepared.length === 0) return 0;
  const boundedRatio = Math.max(0, Math.min(1, safeNumber(ratio)));
  const index = Math.ceil(boundedRatio * prepared.length) - 1;
  return prepared[Math.max(0, Math.min(prepared.length - 1, index))];
}

export function formatTimeTick(value) {
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

export function formatTickHeader(value) {
  if (!value) return { dateLabel: '-', timeLabel: '' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { dateLabel: String(value), timeLabel: '' };
  return {
    dateLabel: date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    timeLabel: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export function isSameCalendarDay(aTs, bTs) {
  const a = new Date(aTs);
  const b = new Date(bTs);
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function toSegmentTypeLabel(segmentType) {
  const key = String(segmentType || '');
  if (SEGMENT_TYPE_SHORT_LABELS[key]) return SEGMENT_TYPE_SHORT_LABELS[key];
  return key
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function toGanttSegmentTypeLabel(segmentType) {
  const key = String(segmentType || '');
  if (GANTT_SEGMENT_DISPLAY_LABELS[key]) return GANTT_SEGMENT_DISPLAY_LABELS[key];
  return toSegmentTypeLabel(key);
}

export function isProcessingEquivalentIdleSegment(segmentType) {
  const type = String(segmentType || '');
  return PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES.has(type);
}

export function isReprocessingSegmentType(segmentType) {
  const type = String(segmentType || '');
  return type === 'SYSTEM_SCHEDULED_REPROCESSING'
    || type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2'
    || isProcessingEquivalentIdleSegment(type);
}

export function toDisplaySegmentTypeCode(segmentType) {
  const type = String(segmentType || '');
  if (type === 'COMPLETE_BY_REVIEW_MARKER') return 'USER_COMPLETION_APPROVAL';
  if (type === 'COMPLETE_BY_EDIT_MARKER') return 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
  if (type === 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER') return 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2';
  if (isReprocessingSegmentType(type)) return 'SYSTEM_SCHEDULED_REPROCESSING';
  return type;
}

export function toCompleteMarkerType(segmentOrType) {
  const segment = segmentOrType && typeof segmentOrType === 'object' ? segmentOrType : null;
  const type = String(segment ? segment.segmentType : segmentOrType || '');
  if (type === 'USER_COMPLETION_APPROVAL') return 'COMPLETE_BY_REVIEW_MARKER';
  if (type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL') return 'COMPLETE_BY_EDIT_MARKER';
  if (segment && segment.hasReprocessRound2CompleteMarker) return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  if (type === 'SYSTEM_SCHEDULED_REPROCESSING_ROUND_2') return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  if (type === 'SYSTEM_SCHEDULED_REPROCESSING') return 'COMPLETE_AFTER_REPROCESS_ROUND_2_MARKER';
  return '';
}

export function mergeContinuousReprocessingSegments(sortedSegments) {
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

export function toDrillGroup(segmentType) {
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

export function toTimelineLane(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (isProcessingEquivalentIdleSegment(type)) return 'System';
  if (type.startsWith('SYSTEM_')) return 'System';
  if (isIdleContextSegment(type)) return 'Idle';
  const userName = String(userNameRaw || '').trim();
  if (userName.toLowerCase() === 'system') return 'System';
  return userName || 'Unknown User';
}

export function isIdleContextSegment(segmentType) {
  const type = String(segmentType || '');
  return (type.startsWith('IDLE_') || type === 'UNKNOWN_FALLBACK_TO_IDLE' || type === 'POST_COMPLETED_ELAPSED' || type === 'UNKNOWN_OR_LOW_CONFIDENCE')
    && !isProcessingEquivalentIdleSegment(type);
}

export function isUserContextSegment(segmentType, userNameRaw) {
  const type = String(segmentType || '');
  if (type.startsWith('USER_')) return true;
  if (type === 'AUTO_TIMEOUT_MARKER') {
    const userName = String(userNameRaw || '').trim().toLowerCase();
    return userName.length > 0 && userName !== 'system';
  }
  return false;
}

export function buildAsteriskPoints(cx, cy, outerRadius = 6, innerRadius = 2.6, spikes = 5) {
  const points = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * step;
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return points.join(' ');
}

export function spreadMarkerPositions(markerItems, minGapPx = 12) {
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

export function buildSheetKey(fileName, pageName) {
  const safeFile = String(fileName || 'Unknown File');
  const safePage = String(pageName || '__NO_PAGE__');
  return `${safeFile}::${safePage}`;
}

export function extractFileNameFromSheetKey(sheetKey) {
  const normalized = String(sheetKey || '');
  const delimiterIndex = normalized.indexOf('::');
  if (delimiterIndex < 0) return normalized;
  return normalized.slice(0, delimiterIndex);
}
