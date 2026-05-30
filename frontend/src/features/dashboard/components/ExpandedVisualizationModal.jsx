import React from 'react';
import { X } from 'lucide-react';
import { GanttTimelineChart } from '../../timeline/GanttTimelineChart.jsx';
import { DonutWorkloadChart } from '../../charts/DonutWorkloadChart.jsx';
import { ReworkMatrixScatterChart } from '../../charts/ReworkMatrixScatterChart.jsx';
import { UserContributionStackChart } from '../../charts/UserContributionStackChart.jsx';
import { ProcessTimeBreakdownChart } from '../../charts/ProcessTimeBreakdownChart.jsx';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';
import { toDrillGroup } from '../../../lib/segmentUtils.js';

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
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
    mergeReviewAndEdit,
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

    let items = [];
    if (mergeReviewAndEdit) {
      const mergedReviewEdit = totals.Review + totals.Edit;
      items = [
        { label: 'Uploading', seconds: totals.Uploading, color: GANTT_DRILL_GROUP_COLORS.Uploading },
        { label: 'Processing', seconds: totals.Processing, color: GANTT_DRILL_GROUP_COLORS.Processing },
        { label: 'Reprocess', seconds: totals.Reprocess, color: GANTT_DRILL_GROUP_COLORS.Reprocessing },
        { label: 'Review And Edit', seconds: mergedReviewEdit, color: '#F59E0B' },
      ];
      if (showProcessBreakdownIdle) {
        items.push({ label: 'Idle', seconds: totals.Idle, color: GANTT_DRILL_GROUP_COLORS.Idle });
      }
    } else {
      items = Object.entries(totals)
        .filter(([label]) => showProcessBreakdownIdle || label !== 'Idle')
        .map(([label, seconds]) => ({
          label,
          seconds,
          color: GANTT_DRILL_GROUP_COLORS[label === 'Reprocess' ? 'Reprocessing' : label] || '#94A3B8'
        }));
    }

    const completeSeconds = totals.Uploading + totals.Processing + totals.Reprocess + totals.Review + totals.Edit + totals.Idle;
    if (completeSeconds > 0) {
      items.push({
        label: 'Complete',
        seconds: completeSeconds,
        color: '#16A34A'
      });
    }
    return items;
  }, [ganttVisibleSegments, processBreakdownSegments, selectedSegmentTypes, showProcessBreakdownIdle, mergeReviewAndEdit]);

  const transitionTimeData = React.useMemo(() => {
    const sourceSegments = processBreakdownSegments || ganttVisibleSegments;
    const groups = new Map();
    sourceSegments.forEach(s => {
      if (!groups.has(s.sheetKey)) groups.set(s.sheetKey, []);
      groups.get(s.sheetKey).push(s);
    });

    let idleAfterProcess = 0, countAfterProcess = 0;
    let idleAfterReprocess = 0, countAfterReprocess = 0;
    let idleBetweenActions = 0, countBetweenActions = 0;

    groups.forEach(segments => {
      const sorted = [...segments].sort((a, b) => a.startTs - b.startTs);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const prevDrill = toDrillGroup(prev.segmentType);
        const currDrill = toDrillGroup(curr.segmentType);
        if (currDrill === 'Idle') {
          const duration = Number(curr.durationSeconds) || 0;
          if (prevDrill === 'Processing') {
            idleAfterProcess += duration;
            countAfterProcess++;
          } else if (prevDrill === 'Reprocessing') {
            idleAfterReprocess += duration;
            countAfterReprocess++;
          } else if (prevDrill === 'Review' || prevDrill === 'Edit' || prevDrill === 'Uploading') {
            const hasFutureAction = sorted.slice(i + 1).some(s => {
              const dg = toDrillGroup(s.segmentType);
              return dg === 'Review' || dg === 'Edit';
            });
            if (hasFutureAction) {
              idleBetweenActions += duration;
              countBetweenActions++;
            }
          }
        }
      }
    });

    return [
      { label: 'After Processing', seconds: countAfterProcess > 0 ? idleAfterProcess / countAfterProcess : 0, totalSeconds: idleAfterProcess, color: '#3b82f6' },
      { label: 'After Reprocessing', seconds: countAfterReprocess > 0 ? idleAfterReprocess / countAfterReprocess : 0, totalSeconds: idleAfterReprocess, color: '#6366f1' },
      { label: 'Between Review And Edit', seconds: countBetweenActions > 0 ? idleBetweenActions / countBetweenActions : 0, totalSeconds: idleBetweenActions, color: '#f59e0b' }
    ];
  }, [ganttVisibleSegments, processBreakdownSegments]);

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
          {visualizationId === 'matrix' && <ProcessTimeBreakdownChart data={transitionTimeData} showLabels={showProcessBreakdownLabels} />}
        </div>
      </div>
    </div>
  );
});
