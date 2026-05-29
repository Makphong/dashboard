import React from 'react';
import { X } from 'lucide-react';
import { GanttTimelineChart } from '../../timeline/GanttTimelineChart.jsx';
import { DonutWorkloadChart } from '../../charts/DonutWorkloadChart.jsx';
import { ReworkMatrixScatterChart } from '../../charts/ReworkMatrixScatterChart.jsx';
import { UserContributionStackChart } from '../../charts/UserContributionStackChart.jsx';
import { ProcessTimeBreakdownChart } from '../../charts/ProcessTimeBreakdownChart.jsx';
import { GANTT_DRILL_GROUP_COLORS } from '../../../lib/constants.js';

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const {
    ganttVisibleSegments,
    workloadVisibleRows,
    contributionRows,
    matrixRows,
    showMatrixQuadrants,
  } = data;

  const processBreakdownData = React.useMemo(() => {
    const totals = { Uploading: 0, Processing: 0, Review: 0, Edit: 0, Idle: 0 };
    ganttVisibleSegments.forEach(s => {
      const type = String(s.segmentType || '');
      const duration = Number(s.durationSeconds) || 0;
      if (type.includes('UPLOAD')) totals.Uploading += duration;
      else if (type.includes('SYSTEM')) totals.Processing += duration;
      else if (type.includes('REVIEW')) totals.Review += duration;
      else if (type.includes('EDIT')) totals.Edit += duration;
      else totals.Idle += duration;
    });
    return Object.entries(totals).map(([label, seconds]) => ({
      label,
      seconds,
      color: GANTT_DRILL_GROUP_COLORS[label] || '#94A3B8'
    }));
  }, [ganttVisibleSegments]);

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
          {visualizationId === 'process-breakdown' && <ProcessTimeBreakdownChart data={processBreakdownData} />}
          {visualizationId === 'contribution' && <UserContributionStackChart rows={contributionRows} expanded />}
          {visualizationId === 'matrix' && <ReworkMatrixScatterChart rows={matrixRows} showQuadrants={showMatrixQuadrants} expanded />}
        </div>
      </div>
    </div>
  );
});
