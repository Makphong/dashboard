import React from 'react';
import { X } from 'lucide-react';
import { GanttTimelineChart } from '../../timeline/GanttTimelineChart.jsx';
import { DonutWorkloadChart } from '../charts/DonutWorkloadChart.jsx';
import { DurationBarChart } from '../charts/DurationBarChart.jsx';
import { ReworkMatrixScatterChart } from '../charts/ReworkMatrixScatterChart.jsx';
import { UserContributionStackChart } from '../charts/UserContributionStackChart.jsx';
import { formatDuration } from '../../../lib/utils.js';

export const ExpandedVisualizationModal = React.memo(({ visualizationId, onClose, data }) => {
  if (!visualizationId) return null;

  const {
    ganttVisibleSegments,
    workloadVisibleRows,
    flowRows,
    contributionRows,
    matrixRows,
    showMatrixQuadrants,
  } = data;

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
          {visualizationId === 'flow' && (
            <DurationBarChart
              rows={flowRows.map((row) => ({
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
            />
          )}
          {visualizationId === 'contribution' && <UserContributionStackChart rows={contributionRows} expanded />}
          {visualizationId === 'matrix' && <ReworkMatrixScatterChart rows={matrixRows} showQuadrants={showMatrixQuadrants} expanded />}
        </div>
      </div>
    </div>
  );
});
