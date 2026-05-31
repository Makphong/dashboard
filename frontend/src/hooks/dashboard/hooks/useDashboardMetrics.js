import { useMemo } from 'react';
import {
  buildKpiData,
  buildKpisFromSegments,
  isIdleContextSegment,
  safeNumber,
  toTimelineLane,
} from '../../../lib/utils.js';
import { initialKpiData } from '../../../lib/constants.js';
import { calculateFlowRows, calculateUserStatsRows } from '../utils/dataParsers.js';
import { toSegmentGroup } from '../utils/segmentData.js';

export function useDashboardMetrics(params) {
  const {
    ganttVisibleSegments,
    filteredBaseSegments,
    showWorkloadIdle,
    selectedSegmentTypes,
  } = params;

  const kpiData = useMemo(() => {
    const kpis = ganttVisibleSegments.length > 0 ? buildKpisFromSegments(ganttVisibleSegments) : null;
    return kpis ? buildKpiData(kpis) : initialKpiData;
  }, [ganttVisibleSegments]);

  const flowRows = useMemo(() => calculateFlowRows(ganttVisibleSegments), [ganttVisibleSegments]);

  const userStatsRows = useMemo(() => calculateUserStatsRows(ganttVisibleSegments), [ganttVisibleSegments]);

  const contributionRows = useMemo(() => userStatsRows.map((row) => ({ ...row })), [userStatsRows]);

  const workloadContributors = useMemo(() => {
    const laneDurationMap = new Map();

    filteredBaseSegments.forEach((segment) => {
      const segmentType = String(segment.segmentType || '');
      const durationSeconds = safeNumber(segment.durationSeconds);
      if (durationSeconds <= 0) return;

      const isIdle = isIdleContextSegment(segmentType);
      if (isIdle && !showWorkloadIdle) return;

      const segmentGroup = toSegmentGroup(segmentType);
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return;

      let lane = toTimelineLane(segmentType, segment.userName);
      if (segmentType.startsWith('SYSTEM_')) lane = 'System';
      if (isIdle) lane = 'Idle';
      laneDurationMap.set(lane, (laneDurationMap.get(lane) || 0) + durationSeconds);
    });

    return Array.from(laneDurationMap.entries())
      .map(([user, totalSeconds]) => ({ user, totalSeconds }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [filteredBaseSegments, showWorkloadIdle, selectedSegmentTypes]);

  return {
    kpiData,
    flowRows,
    contributionRows,
    workloadContributors,
  };
}
