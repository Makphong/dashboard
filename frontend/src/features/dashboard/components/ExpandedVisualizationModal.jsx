import React from 'react';
import { X } from 'lucide-react';
import { GanttTimelineChart } from '../../timeline/GanttTimelineChart.jsx';
import { DonutWorkloadChart } from '../../charts/DonutWorkloadChart.jsx';
import { DurationBarChart } from '../../charts/DurationBarChart.jsx';
import { ReworkMatrixScatterChart } from '../../charts/ReworkMatrixScatterChart.jsx';
import { formatDuration } from '../../../lib/utils.js';

export function ExpandedVisualizationModal({ visualizationId, onClose, data }) {
  if (!visualizationId) return null;

  const { ganttVisibleSegments, workloadVisibleRows, flowRows, matrixRows } = data;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Visualization</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-auto p-6">
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
          {visualizationId === 'matrix' && <ReworkMatrixScatterChart rows={matrixRows} expanded />}
        </div>
      </div>
    </div>
  );
}
