import {
  CORE_WORK_SESSION_TYPES,
  initialKpiData
} from './constants.js';
import { Clock, Users, Timer, RefreshCw, AlertTriangle } from 'lucide-react';
import { formatDuration, formatPercent } from './durationFormatters.js';
import { safeNumber } from './numberUtils.js';
import { isIdleContextSegment, isProcessingEquivalentIdleSegment } from './segmentUtils.js';

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
      subtext: `${formatDuration(kpis.editTimeSeconds || 0)} edit / ${kpis.activeUserTimeDisplay || '0s'} active`,
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
  const editTimeSeconds = coreUserSegments
    .filter((segment) => {
      const type = String(segment.segmentType || '');
      return type === 'USER_EDITING_CORRECTION' || type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
    })
    .reduce((sum, segment) => sum + effectiveDuration(segment), 0);
  const reworkRate = activeUserTimeSeconds > 0 ? (editTimeSeconds / activeUserTimeSeconds) : 0;

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

  const reworkSessions = coreUserSegments.filter((segment) => {
    const type = String(segment.segmentType || '');
    return type === 'USER_EDITING_CORRECTION' || type === 'USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL';
  }).length;

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
    editTimeSeconds,
    totalSessions,
    autoClosedRate,
  };
}
