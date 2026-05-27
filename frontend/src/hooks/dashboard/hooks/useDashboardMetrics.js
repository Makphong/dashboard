import { useMemo } from 'react';
import { calculateFlowRows, calculateUserStatsRows } from '../utils/dataParsers.js';
import { toTimelineLane, isIdleContextSegment, safeNumber, buildKpisFromSegments, buildKpiData } from '../../../lib/utils.js';
import { initialKpiData } from '../../../lib/constants.js';

export function useDashboardMetrics(ganttVisibleSegments) {
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
