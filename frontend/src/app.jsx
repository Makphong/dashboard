import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Server, 
  Star, 
  Timer, 
  Eye, 
  FileSpreadsheet, 
  Maximize2, 
  RefreshCw,
  Search,
  X,
  SlidersHorizontal,
  Menu,
  User
} from 'lucide-react';

import { Sidebar } from './components/shared/Sidebar.jsx';
import { EmptyState } from './components/shared/EmptyState.jsx';
import { KpiSubtext } from './components/shared/KpiSubtext.jsx';

// Feature Components
import { GanttTimelineChart } from './features/timeline/GanttTimelineChart.jsx';
import { DataManagementView } from './features/data-management/DataManagementView.jsx';
import { DurationBarChart } from './features/charts/DurationBarChart.jsx';
import { DonutWorkloadChart } from './features/charts/DonutWorkloadChart.jsx';
import { UserContributionStackChart } from './features/charts/UserContributionStackChart.jsx';
import { ReworkMatrixScatterChart } from './features/charts/ReworkMatrixScatterChart.jsx';
import { SystemProcessingTrendChart } from './features/charts/SystemProcessingTrendChart.jsx';
import { SystemParetoChart } from './features/charts/SystemParetoChart.jsx';
import { SystemBottleneckTable } from './features/charts/SystemBottleneckTable.jsx';
import { FlowDelayComparisonTable } from './features/charts/FlowDelayComparisonTable.jsx';

// Custom Hooks & Components
import { useDashboardData } from './hooks/useDashboardData.js';
import { FilterBar } from './features/dashboard/FilterBar.jsx';
import { requestJson } from './lib/api.js';
import { 
  formatDuration, 
  toGanttSegmentTypeLabel, 
  toDisplayDate, 
  toTimelineLane, 
  toDrillGroup, 
  toExcelDateTime, 
  downloadExcelTable,
  safeNumber
} from './lib/utils.js';
import { 
  GANTT_DRILL_GROUP_LABELS, 
  FLOW_INSIGHT_GROUPS,
  WORKFLOW_FLOW_SEGMENT_TYPES
} from './lib/constants.js';

function App() {
  const dashboard = useDashboardData();
  const {
    sources, gsheetConnections, performance, healthInfo, debugInfo,
    loading, syncing, errorMessage, setErrorMessage,
    datePreset, dateStart, dateEnd,
    selectedFiles, selectedSheets, selectedUsers, selectedSegmentTypes,
    showIdle, setShowIdle, showWorkloadIdle, setShowWorkloadIdle, showWorkloadSystem, setShowWorkloadSystem,
    ganttVisibleSegments, kpiData, filteredBaseSegments,
    flowRows, contributionRows, matrixRows, workloadContributors,
    refreshAll
  } = dashboard;

  // Local UI State
  const [activeView, setActiveView] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState('');
  const [expandedVisualizationId, setExpandedVisualizationId] = useState('');
  const [selectedGanttSegment, setSelectedGanttSegment] = useState(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Search/Filter state for the popovers (not persistent)
  const [userSearchText, setUserSearchText] = useState('');
  const [segmentTypeSearchText, setSegmentTypeSearchText] = useState('');
  const [documentFileSearch, setDocumentFileSearch] = useState('');
  const [documentSheetSearch, setDocumentSheetSearch] = useState('');

  // Timeline & Workload local toggles
  const [showTimelineFilterMenu, setShowTimelineFilterMenu] = useState(false);
  const [showWorkloadFilterMenu, setShowWorkloadFilterMenu] = useState(false);
  const [showMatrixFilterMenu, setShowMatrixFilterMenu] = useState(false);
  const [showMatrixQuadrants, setShowMatrixQuadrants] = useState(false);

  const [ganttSingleLaneMode, setGanttSingleLaneMode] = useState(false);
  const [showSystemLane, setShowSystemLane] = useState(true);
  const [showStarMarkers, setShowStarMarkers] = useState(true);
  const [ganttCollapseGaps, setGanttCollapseGaps] = useState(false);
  const [showGanttLegend, setShowGanttLegend] = useState(true);
  const [timelineNotice, setTimelineNotice] = useState('');

  const timelineFilterRef = useRef(null);
  const workloadFilterRef = useRef(null);
  const matrixFilterRef = useRef(null);

  const workloadVisibleRows = useMemo(() => {
    const filtered = workloadContributors.filter(r => showWorkloadSystem || r.user !== 'System');
    const total = filtered.reduce((sum, r) => sum + r.totalSeconds, 0);
    return filtered.map(r => ({ ...r, share: total > 0 ? r.totalSeconds / total : 0 }));
  }, [workloadContributors, showWorkloadSystem]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineFilterRef.current && !timelineFilterRef.current.contains(event.target)) {
        setShowTimelineFilterMenu(false);
      }
      if (workloadFilterRef.current && !workloadFilterRef.current.contains(event.target)) {
        setShowWorkloadFilterMenu(false);
      }
      if (matrixFilterRef.current && !matrixFilterRef.current.contains(event.target)) {
        setShowMatrixFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (timelineNotice) {
      const timer = setTimeout(() => setTimelineNotice(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [timelineNotice]);

  const toggleSystemLane = () => {
    const nextVal = !showSystemLane;
    setShowSystemLane(nextVal);
    if (nextVal && showIdle && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleIdleGaps = () => {
    const nextVal = !showIdle;
    setShowIdle(nextVal);
    if (nextVal && showSystemLane && ganttCollapseGaps) setGanttCollapseGaps(false);
  };

  const toggleCollapseGaps = () => {
    if (!ganttCollapseGaps) {
      if (showSystemLane && showIdle) {
        setTimelineNotice('Cannot collapse gaps when both System and Idle lanes are visible');
        return;
      }
    }
    setGanttCollapseGaps(!ganttCollapseGaps);
  };

  const handleUploadFiles = async (files) => {
    setUploading(true);
    try {
      const payloadFiles = await Promise.all(files.map(async f => {
        const reader = new FileReader();
        const base64 = await new Promise(r => {
          reader.onload = () => r(String(reader.result).split(',')[1]);
          reader.readAsDataURL(f);
        });
        return { name: f.name, contentBase64: base64 };
      }));
      await requestJson('/api/upload', { method: 'POST', body: JSON.stringify({ files: payloadFiles }) });
      await refreshAll();
    } catch (e) { setErrorMessage(e.message); } finally { setUploading(false); }
  };

  const handleDeleteSource = async (id) => {
    try { await requestJson(`/api/sources/${encodeURIComponent(id)}`, { method: 'DELETE' }); await refreshAll(); } catch (e) { setErrorMessage(e.message); }
  };

  const handleConnectGSheet = async (url) => {
    try { await requestJson('/api/gsheet/connect', { method: 'POST', body: JSON.stringify({ url }) }); await refreshAll(); } catch (e) { setErrorMessage(e.message); }
  };

  const handleDisconnectGSheet = async (id) => {
    try { await requestJson(`/api/gsheet/${encodeURIComponent(id)}`, { method: 'DELETE' }); await refreshAll(); } catch (e) { setErrorMessage(e.message); }
  };

  const exportTimelineExcel = () => {
    if (ganttVisibleSegments.length === 0) return;
    const columns = [ { key: 'no', label: 'No.' }, { key: 'lane', label: 'Lane' }, { key: 'userName', label: 'User' }, { key: 'segmentLabel', label: 'Segment' }, { key: 'start', label: 'Start' }, { key: 'end', label: 'End' }, { key: 'duration', label: 'Duration' } ];
    const rows = ganttVisibleSegments.map((s, idx) => ({
      no: idx + 1,
      lane: toTimelineLane(s.segmentType, s.userName),
      userName: s.userName,
      segmentLabel: toGanttSegmentTypeLabel(s.segmentType),
      start: toExcelDateTime(s.start),
      end: toExcelDateTime(s.end),
      duration: formatDuration(s.durationSeconds)
    }));
    downloadExcelTable('timeline-export.xls', 'Timeline', columns, rows);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <FilterBar
          dashboard={dashboard}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
          userSearchText={userSearchText}
          setUserSearchText={setUserSearchText}
          segmentTypeSearchText={segmentTypeSearchText}
          setSegmentTypeSearchText={setSegmentTypeSearchText}
          documentFileSearch={documentFileSearch}
          setDocumentFileSearch={setDocumentFileSearch}
          documentSheetSearch={documentSheetSearch}
          setDocumentSheetSearch={setDocumentSheetSearch}
          onMenuClick={() => setIsMobileSidebarOpen(true)}
        />

        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140] lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {errorMessage && <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">{errorMessage}</div>}

          {activeView === 'data-management' ? (
            <DataManagementView
              sources={sources}
              onUploadFiles={handleUploadFiles}
              onDeleteSource={handleDeleteSource}
              onConnectGSheet={handleConnectGSheet}
              onDisconnectGSheet={handleDisconnectGSheet}
              gsheetConnections={gsheetConnections}
              uploading={uploading}
              syncing={syncing}
            />
          ) : activeView === 'system-performance' ? (
            <div className="max-w-[1600px] mx-auto space-y-6">
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <h2 className="text-lg font-bold mb-6">Processing Trend</h2>
                 <SystemProcessingTrendChart segments={ganttVisibleSegments} />
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                   <h2 className="text-lg font-bold mb-6">Pareto Analysis</h2>
                   <SystemParetoChart segments={ganttVisibleSegments} />
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                   <h2 className="text-lg font-bold mb-6">Flow Comparison</h2>
                   <FlowDelayComparisonTable 
                     rows={flowRows.map(r => ({
                       ...r,
                       label: r.transitionLabel
                     }))} 
                   />
                 </div>
               </div>
               <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                 <h2 className="text-lg font-bold mb-6">System Bottlenecks</h2>
                 <SystemBottleneckTable segments={ganttVisibleSegments} />
               </div>
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-6">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard Overview</h1>
                  <p className="text-slate-500 mt-1">Real-time performance metrics and timeline analysis.</p>
                </div>
              </div>

              {/* KPIs */}
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

              {/* Timeline */}
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
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${ganttSingleLaneMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${ganttSingleLaneMode ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={ganttSingleLaneMode} onChange={() => setGanttSingleLaneMode(!ganttSingleLaneMode)} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Merge User Lanes</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${showSystemLane ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showSystemLane ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={showSystemLane} onChange={toggleSystemLane} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Show System Lane</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${showIdle ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showIdle ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={showIdle} onChange={toggleIdleGaps} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Show Idle Gaps</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${showStarMarkers ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showStarMarkers ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={showStarMarkers} onChange={() => setShowStarMarkers(!showStarMarkers)} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Show Event Markers</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group relative">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${ganttCollapseGaps ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${ganttCollapseGaps ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={ganttCollapseGaps} onChange={toggleCollapseGaps} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Collapse Time Gaps</span>
                              {timelineNotice && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl animate-bounce-in z-20">
                                  {timelineNotice}
                                </div>
                              )}
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${showGanttLegend ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showGanttLegend ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={showGanttLegend} onChange={() => setShowGanttLegend(!showGanttLegend)} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Show Legend</span>
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

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px] relative group">
                  <div className="absolute right-4 top-4 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative" ref={workloadFilterRef}>
                      <button onClick={() => setShowWorkloadFilterMenu(!showWorkloadFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showWorkloadFilterMenu ? 'text-blue-600 border-blue-200' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
                      {showWorkloadFilterMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Workload Settings</div>
                          <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${showWorkloadIdle ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showWorkloadIdle ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={showWorkloadIdle} onChange={() => setShowWorkloadIdle(!showWorkloadIdle)} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Show Idle Time</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                              <div className={`w-8 h-4 rounded-full transition-colors relative ${showWorkloadSystem ? 'bg-blue-600' : 'bg-slate-200'}`}>
                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showWorkloadSystem ? 'translate-x-4' : ''}`} />
                              </div>
                              <input type="checkbox" className="hidden" checked={showWorkloadSystem} onChange={() => setShowWorkloadSystem(!showWorkloadSystem)} />
                              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Show System Time</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                    <button onClick={() => setExpandedVisualizationId('donut')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white"><Maximize2 className="w-4 h-4" /></button>
                  </div>
                  <h2 className="text-lg font-bold mb-4">Workload Share</h2>
                  <div className="flex-1 min-h-0">
                    {workloadVisibleRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : (
                      <DonutWorkloadChart 
                        rows={workloadVisibleRows} 
                      />
                    )}
                  </div>
                </div>
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px] relative group">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Top User Work Mix</h2>
                    <button onClick={() => setExpandedVisualizationId('contribution')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex-1 min-h-0">
                    {contributionRows.length === 0 ? <EmptyState icon={Users} title="No Data" /> : <UserContributionStackChart rows={contributionRows} maxVisibleRows={3} />}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px] relative group">
                   <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold">Step Delay Analysis</h2>
                      <button onClick={() => setExpandedVisualizationId('flow')} className="p-1.5 border rounded-md text-slate-400 hover:text-slate-600 bg-white opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-4 h-4" /></button>
                   </div>
                   <div className="flex-1 min-h-0">
                      {flowRows.length === 0 ? <EmptyState icon={RefreshCw} title="No Data" /> : (
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
                   </div>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-[400px] relative group">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-bold">Quality vs Edit Matrix</h2>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative" ref={matrixFilterRef}>
                          <button onClick={() => setShowMatrixFilterMenu(!showMatrixFilterMenu)} className={`p-1.5 border rounded-md transition-colors bg-white ${showMatrixFilterMenu ? 'text-blue-600 border-blue-200 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><SlidersHorizontal className="w-4 h-4" /></button>
                          {showMatrixFilterMenu && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-[110] dropdown-slide-enter">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Chart Controls</div>
                              <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                  <input 
                                    type="checkbox" 
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
                                    checked={showMatrixQuadrants} 
                                    onChange={() => setShowMatrixQuadrants(!showMatrixQuadrants)} 
                                  />
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
          )}

          {/* Segment Detail Popup */}
          {selectedGanttSegment && (
            <div className="fixed inset-0 z-[150] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 confirm-overlay-enter" onClick={() => setSelectedGanttSegment(null)}>
              <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden confirm-panel-enter" onClick={e => e.stopPropagation()}>
                <div className={`h-2 ${selectedGanttSegment.actorType === 'System' ? 'bg-slate-400' : 'bg-blue-500'}`} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{toGanttSegmentTypeLabel(selectedGanttSegment.segmentType)}</h3>
                      <div className="text-sm text-slate-500 font-medium">Segment Details</div>
                    </div>
                    <button onClick={() => setSelectedGanttSegment(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Actor</div>
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        {selectedGanttSegment.actorType === 'System' ? <Server className="w-3.5 h-3.5 text-slate-400" /> : <User className="w-3.5 h-3.5 text-blue-500" />}
                        {selectedGanttSegment.userName}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Duration</div>
                      <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(selectedGanttSegment.durationSeconds)}
                      </div>
                    </div>
                    <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Time Window</div>
                      <div className="text-sm font-bold text-slate-700">
                        {toDisplayDate(selectedGanttSegment.start)} — {toDisplayDate(selectedGanttSegment.end)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expanded Vis Modal */}
          {expandedVisualizationId && (
            <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
               <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Visualization</h2>
                    <button onClick={() => setExpandedVisualizationId('')} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                    {expandedVisualizationId === 'gantt' && <GanttTimelineChart segments={ganttVisibleSegments} expanded />}
                    {expandedVisualizationId === 'donut' && <DonutWorkloadChart rows={workloadVisibleRows} expanded />}
                    {expandedVisualizationId === 'flow' && (
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
                    {expandedVisualizationId === 'matrix' && <ReworkMatrixScatterChart rows={matrixRows} showQuadrants={showMatrixQuadrants} expanded />}
                  </div>
               </div>
            </div>
          )}

          {/* Export Confirm */}
          {showExportConfirm && (
            <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
                <FileSpreadsheet className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Export to Excel</h3>
                <p className="text-slate-500 mb-8">Export {ganttVisibleSegments.length} segments?</p>
                <div className="flex gap-4">
                  <button onClick={() => setShowExportConfirm(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button>
                  <button onClick={() => { setShowExportConfirm(false); exportTimelineExcel(); }} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold">Export</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
