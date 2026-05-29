import React, { useEffect, useRef, useState, memo } from 'react';
import { usePersistentState } from '../../hooks/usePersistentState.js';
import { FileSpreadsheet, LayoutDashboard, Maximize2, RefreshCw, Search, SlidersHorizontal, Users, Clock } from 'lucide-react';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { KpiSubtext } from '../../components/shared/KpiSubtext.jsx';
import { DonutWorkloadChart } from '../charts/DonutWorkloadChart.jsx';
import { ReworkMatrixScatterChart } from '../charts/ReworkMatrixScatterChart.jsx';
import { UserContributionStackChart } from '../charts/UserContributionStackChart.jsx';
import { GanttTimelineChart } from '../timeline/GanttTimelineChart.jsx';
import { ProcessTimeBreakdownChart } from '../charts/ProcessTimeBreakdownChart.jsx';
import { GANTT_DRILL_GROUP_COLORS } from '../../lib/constants.js';
import { toDrillGroup } from '../../lib/segmentUtils.js';

function ToggleSetting({ checked, onChange, children, notice }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group relative">
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-[#00a4e4]' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
      <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">{children}</span>
      {notice && (
        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl animate-bounce-in z-20">
          {notice}
        </div>
      )}
    </label>
  );
}

export const DashboardView = React.memo(({
  dashboard,
  workloadVisibleRows,
  showMatrixQuadrants,
  setShowMatrixQuadrants,
  showProcessBreakdownIdle,
  setShowProcessBreakdownIdle,
  showProcessBreakdownLabels,
  setShowProcessBreakdownLabels,
  setSelectedGanttSegment,
  setExpandedVisualizationId,
  setShowExportConfirm
}) => {
  const {
    kpiData,
    ganttVisibleSegments,
    filteredBaseSegments,
    selectedSegmentTypes,
    contributionRows,
    matrixRows,
    showIdle,
    setShowIdle,
    showWorkloadIdle,
    setShowWorkloadIdle,
    showWorkloadSystem,
    setShowWorkloadSystem,
  } = dashboard;

  const processBreakdownData = React.useMemo(() => {
    const totals = { Uploading: 0, Processing: 0, Reprocess: 0, Review: 0, Edit: 0, Idle: 0 };
    filteredBaseSegments.forEach(s => {
      const segmentType = String(s.segmentType || '');
      const drillGroup = toDrillGroup(s.segmentType);
      const segmentGroup = drillGroup === 'Reprocessing'
        ? 'Reprocess'
        : (drillGroup === 'ReviewAutoClose' ? 'Review' : (drillGroup === 'EditAndComplete' ? 'Edit' : drillGroup));
      if (selectedSegmentTypes.length > 0 && !selectedSegmentTypes.includes(segmentGroup)) return;
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
  }, [filteredBaseSegments, selectedSegmentTypes, showProcessBreakdownIdle]);

  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [showWorkloadFilterMenu, setShowWorkloadFilterMenu] = useState(false);
  const [showProcessFilterMenu, setShowProcessFilterMenu] = useState(false);
  const [showMatrixFilterMenu, setShowMatrixFilterMenu] = useState(false);
  const [ganttSingleLaneMode, setGanttSingleLaneMode] = usePersistentState('filter_ganttSingleLaneMode', false);
  const [showSystemLane, setShowSystemLane] = usePersistentState('filter_showSystemLane', true);
  const [showStarMarkers, setShowStarMarkers] = usePersistentState('filter_showStarMarkers', true);
  const [ganttCollapseGaps, setGanttCollapseGaps] = usePersistentState('filter_ganttCollapseGaps', false);
  const [showGanttLegend, setShowGanttLegend] = usePersistentState('filter_showGanttLegend', true);
  const [timelineNotice, setTimelineNotice] = useState('');

  const timelineFilterRef = useRef(null);
  const workloadFilterRef = useRef(null);
  const processFilterRef = useRef(null);
  const matrixFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineFilterRef.current && !timelineFilterRef.current.contains(event.target)) setShowTimelineFilterMenu(false);
      if (workloadFilterRef.current && !workloadFilterRef.current.contains(event.target)) setShowWorkloadFilterMenu(false);
      if (processFilterRef.current && !processFilterRef.current.contains(event.target)) setShowProcessFilterMenu(false);
      if (matrixFilterRef.current && !matrixFilterRef.current.contains(event.target)) setShowMatrixFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!timelineNotice) return undefined;
    const timer = setTimeout(() => setTimelineNotice(''), 3000);
    return () => clearTimeout(timer);
  }, [timelineNotice]);

  const toggleSystemLane = () => {
    const nextValue = !showSystemLane;
    setShowSystemLane(nextValue);
    if (nextValue && showIdle && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleIdleGaps = () => {
    const nextValue = !showIdle;
    setShowIdle(nextValue);
    if (nextValue && showSystemLane && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleCollapseGaps = () => {
    if (!ganttCollapseGaps && showSystemLane && showIdle) {
      setTimelineNotice('Cannot collapse gaps when both System and Idle lanes are visible');
      return;
    }
    setGanttCollapseGaps(!ganttCollapseGaps);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#17335f]">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Real-time performance metrics and timeline analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi, idx) => (
          <div key={kpi.id} className={`relative bg-white p-5 rounded-2xl border border-[#d7e8f6] shadow-ktb animate-stagger-${Math.min(idx + 1, 5)}`}>
            {kpi.id === 6 && (
              /* Krungthai mascot sitting on top of the System Time card */
              <div className="absolute bottom-full right-2 w-28 h-28 pointer-events-none select-none z-0">
                <img 
                  src="https://i.postimg.cc/zvnXJcPC/d-sin-th-y-ngmi-di-t-ngch-x-(1).png" 
                  className="w-full h-full object-contain object-bottom opacity-100 brightness-[1.15]"
                  alt="Krungthai mascot"
                />
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-4 relative z-10`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1 relative z-10">{kpi.label}</div>
            <div className="text-3xl font-extrabold text-[#17335f] relative z-10">{kpi.value}</div>
            <div className="relative z-10">
              <KpiSubtext text={kpi.subtext} />
            </div>
          </div>
        ))}
      </div>

      <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb relative group animate-stagger-2 ${showTimelineFilterMenu ? 'z-[120]' : 'z-10'}`}>
        <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setShowExportConfirm(true)} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><FileSpreadsheet className="w-4 h-4" /></button>
          <div className="relative" ref={timelineFilterRef}>
            <button onClick={() => setShowTimelineFilterMenu(!showTimelineFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showTimelineFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
            {showTimelineFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline Settings</div>
                <div className="space-y-3">
                  <ToggleSetting checked={ganttSingleLaneMode} onChange={() => setGanttSingleLaneMode(!ganttSingleLaneMode)}>Merge User Lanes</ToggleSetting>
                  <ToggleSetting checked={showSystemLane} onChange={toggleSystemLane}>Show System Lane</ToggleSetting>
                  <ToggleSetting checked={showIdle} onChange={toggleIdleGaps}>Show Idle Gaps</ToggleSetting>
                  <ToggleSetting checked={showStarMarkers} onChange={() => setShowStarMarkers(!showStarMarkers)}>Show Event Markers</ToggleSetting>
                  <ToggleSetting checked={ganttCollapseGaps} onChange={toggleCollapseGaps} notice={timelineNotice}>Collapse Time Gaps</ToggleSetting>
                  <ToggleSetting checked={showGanttLegend} onChange={() => setShowGanttLegend(!showGanttLegend)}>Show Legend</ToggleSetting>
                </div>
              </div>
            )}
          </div>
          <button onClick={() => setExpandedVisualizationId('gantt')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
        </div>
        <h2 className="text-lg font-bold mb-6 text-[#17335f]">Timeline by User</h2>
        {ganttVisibleSegments.length === 0 ? <EmptyState icon={LayoutDashboard} title="No Data" /> : (
          <GanttTimelineChart
            segments={ganttVisibleSegments}
            onSelectSegment={setSelectedGanttSegment}
            singleLane={ganttSingleLaneMode}
            showSystemLane={showSystemLane}
            showIdleLane={showIdle}
            showStarMarkers={showStarMarkers}
            collapseGaps={ganttCollapseGaps}
            showGanttLegend={showGanttLegend}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-3">
          <div className="absolute right-4 top-4 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative" ref={workloadFilterRef}>
              <button onClick={() => setShowWorkloadFilterMenu(!showWorkloadFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showWorkloadFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
              {showWorkloadFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Workload Settings</div>
                  <div className="space-y-3">
                    <ToggleSetting checked={showWorkloadIdle} onChange={() => setShowWorkloadIdle(!showWorkloadIdle)}>Show Idle Time</ToggleSetting>
                    <ToggleSetting checked={showWorkloadSystem} onChange={() => setShowWorkloadSystem(!showWorkloadSystem)}>Show System Time</ToggleSetting>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setExpandedVisualizationId('donut')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
          </div>
          <h2 className="text-lg font-bold mb-4 text-[#17335f]">Workload Share</h2>
          <div className="flex-1 min-h-0">
            {workloadVisibleRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <DonutWorkloadChart rows={workloadVisibleRows} />}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#17335f]">Top User Work Mix</h2>
            <button onClick={() => setExpandedVisualizationId('contribution')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 min-h-0">
            {contributionRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <UserContributionStackChart rows={contributionRows} maxVisibleRows={3} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4 ${showProcessFilterMenu ? 'z-[120]' : 'z-10'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#17335f]">Process Time Breakdown</h2>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative" ref={processFilterRef}>
                <button onClick={() => setShowProcessFilterMenu(!showProcessFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showProcessFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
                {showProcessFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Process Settings</div>
                    <div className="space-y-3">
                      <ToggleSetting checked={showProcessBreakdownIdle} onChange={() => setShowProcessBreakdownIdle(!showProcessBreakdownIdle)}>Show Idle Time</ToggleSetting>
                      <ToggleSetting checked={showProcessBreakdownLabels} onChange={() => setShowProcessBreakdownLabels(!showProcessBreakdownLabels)}>Show Bar Labels</ToggleSetting>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setExpandedVisualizationId('process-breakdown')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {filteredBaseSegments.length === 0 ? <EmptyState icon={Clock} title="No Data" /> : <ProcessTimeBreakdownChart data={processBreakdownData} showLabels={showProcessBreakdownLabels} />}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#d7e8f6] shadow-ktb flex flex-col min-h-[400px] relative group animate-stagger-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#17335f]">Quality vs Edit Matrix</h2>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="relative" ref={matrixFilterRef}>
                <button onClick={() => setShowMatrixFilterMenu(!showMatrixFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showMatrixFilterMenu ? 'text-blue-600 border-blue-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
                {showMatrixFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter" onMouseLeave={() => setShowMatrixFilterMenu(false)}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Chart Controls</div>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={showMatrixQuadrants} onChange={() => setShowMatrixQuadrants(!showMatrixQuadrants)} />
                        <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">Show Quadrant Labels</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setExpandedVisualizationId('matrix')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {matrixRows.length === 0 ? <EmptyState icon={Search} title="No Data" /> : <ReworkMatrixScatterChart rows={matrixRows} showQuadrants={showMatrixQuadrants} />}
          </div>
        </div>
      </div>
    </div>
  );
});
