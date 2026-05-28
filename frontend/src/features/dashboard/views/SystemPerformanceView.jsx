import React from 'react';
import { SystemProcessingTrendChart } from '../../charts/SystemProcessingTrendChart.jsx';
import { SystemParetoChart } from '../../charts/SystemParetoChart.jsx';
import { FlowDelayComparisonTable } from '../../charts/FlowDelayComparisonTable.jsx';
import { SystemBottleneckTable } from '../../charts/SystemBottleneckTable.jsx';

export function SystemPerformanceView({ segments }) {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold mb-6">Processing Trend</h2>
        <SystemProcessingTrendChart segments={segments} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Pareto Analysis</h2>
          <SystemParetoChart segments={segments} />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold mb-6">Flow Comparison</h2>
          <FlowDelayComparisonTable segments={segments} />
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold mb-6">System Bottlenecks</h2>
        <SystemBottleneckTable segments={segments} />
      </div>
    </div>
  );
}
