import React, { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, Users, FileSpreadsheet, Maximize2, SlidersHorizontal } from 'lucide-react';
import { GanttTimelineChart } from '../charts/GanttTimelineChart.jsx';
import { DonutWorkloadChart } from '../charts/DonutWorkloadChart.jsx';
import { UserContributionStackChart } from '../charts/UserContributionStackChart.jsx';
import { DurationBarChart } from '../charts/DurationBarChart.jsx';
import { ReworkMatrixScatterChart } from '../charts/ReworkMatrixScatterChart.jsx';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { KpiSubtext } from '../../components/shared/KpiSubtext.jsx';
import { formatDuration } from '../../lib/utils.js';

export function DashboardView({
  dashboard,
  setSelectedGanttSegment,
  setExpandedVisualizationId,
  setShowExportConfirm
}) {
  const {
    kpiData, ganttVisibleSegments, workloadContributors,
    flowRows, contributionRows, matrixRows, showWorkloadSystem
  } = dashboard;

  const [ganttSingleLaneMode, setGanttSingleLaneMode] = useState(false);
  const [showSystemLane, setShowSystemLane] = useState(true);
  const [showIdle, setShowIdle] = useState(false);
  const [showStarMarkers, setShowStarMarkers] = useState(true);
  const [ganttCollapseGaps, setGanttCollapseGaps] = useState(false);
  const [showGanttLegend, setShowGanttLegend] = useState(true);
  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [timelineNotice, setTimelineNotice] = useState('');
  
  const [showWorkloadFilterMenu, setShowWorkloadFilterMenu] = useState(false);
  const [showWorkloadIdle, setShowWorkloadIdle] = useState(false);
  
  const timelineFilterRef = useRef(null);
  const workloadFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineFilterRef.current && !timelineFilterRef.current.contains(event.target)) setShowTimelineFilterMenu(false);
      if (workloadFilterRef.current && !workloadFilterRef.current.contains(event.target)) setShowWorkloadFilterMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const workloadVisibleRows = React.useMemo(() => {
    const filtered = workloadContributors.filter(r => showWorkloadSystem || r.user !== 'System');
    const total = filtered.reduce((sum, r) => sum + r.totalSeconds, 0);
    return filtered.map(r => ({ ...r, share: total > 0 ? r.totalSeconds / total : 0 }));
  }, [workloadContributors, showWorkloadSystem]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Real-time performance metrics and timeline analysis.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiData.map((kpi) => (
          <div key={kpi.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-4`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="text-slate-500 text-sm font-semibold mb-1">{kpi.label}</div>
            <div className="text-3xl font-extrabold text-slate-900">{kpi.value}</div>
            <KpiSubtext text={kpi.subtext} />
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative group">
        <div className="absolute right-4 top-4 z-30 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button onClick={() => setShowExportConfirm(true)} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><FileSpreadsheet className="w-4 h-4" /></button>
           <div className="relative" ref={timelineFilterRef}>
            <button onClick={() => setShowTimelineFilterMenu(!showTimelineFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showTimelineFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
            {showTimelineFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Timeline Settings</div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={ganttSingleLaneMode} onChange={() => setGanttSingleLaneMode(!ganttSingleLaneMode)} />
                      <span className="text-xs font-semibold text-slate-600">Merge User Lanes</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={showSystemLane} onChange={() => setShowSystemLane(!showSystemLane)} />
                      <span className="text-xs font-semibold text-slate-600">Show System Lane</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" checked={showIdle} onChange={() => setShowIdle(!showIdle)} />
                      <span className="text-xs font-semibold text-slate-600">Show Idle Gaps</span>
                    </label>
                  </div>
              </div>
            )}
           </div>
           <button onClick={() => setExpandedVisualizationId('gantt')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
        </div>
        <h2 className="text-lg font-bold mb-6">Timeline by User</h2>
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
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold mb-4">Workload Share</h2>
          <div className="flex-1 min-h-0">
            {workloadVisibleRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <DonutWorkloadChart rows={workloadVisibleRows} />}
          </div>
        </div>
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px]">
          <h2 className="text-lg font-bold mb-4">Top User Work Mix</h2>
          <div className="flex-1 min-h-0">
            {contributionRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <UserContributionStackChart rows={contributionRows} maxVisibleRows={3} />}
          </div>
        </div>
      </div>
    </div>
  );
}
