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
