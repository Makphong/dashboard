import React, { Suspense, lazy, useMemo } from 'react';
import { useAppController } from './hooks/useAppController.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { DashboardLayout } from './features/dashboard/DashboardLayout.jsx';

const DashboardView = lazy(() => import('./features/dashboard/DashboardView.jsx').then((module) => ({ default: module.DashboardView })));
const DataManagementView = lazy(() => import('./features/data-management/DataManagementView.jsx').then((module) => ({ default: module.DataManagementView })));
const SystemPerformanceView = lazy(() => import('./features/dashboard/views/SystemPerformanceView.jsx').then((module) => ({ default: module.SystemPerformanceView })));
const ExpandedVisualizationModal = lazy(() => import('./features/dashboard/components/ExpandedVisualizationModal.jsx').then((module) => ({ default: module.ExpandedVisualizationModal })));
const SegmentDetailPopup = lazy(() => import('./features/dashboard/components/SegmentDetailPopup.jsx').then((module) => ({ default: module.SegmentDetailPopup })));

function PanelLoader() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="h-10 w-64 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, idx) => (
          <div key={idx} className="h-36 rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb animate-pulse" />
        ))}
      </div>
      <div className="h-[28rem] rounded-2xl border border-[#d7e8f6] bg-white shadow-ktb animate-pulse" />
    </div>
  );
}

function DataManagementLoader() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <div className="h-10 w-56 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
        <div className="h-72 rounded-2xl bg-slate-100 animate-pulse" />
      </div>
    </div>
  );
}

function App() {
  const dashboard = useDashboardData();
  const controller = useAppController(dashboard);

  const resolvedSelectedGanttSegment = useMemo(() => {
    const selected = controller.selectedGanttSegment;
    if (!selected) return null;

    const latestMatch = (dashboard.ganttVisibleSegments || []).find((segment) =>
      String(segment.fileName || '') === String(selected.fileName || '')
      && String(segment.pageName || '') === String(selected.pageName || '')
      && String(segment.start || '') === String(selected.start || '')
      && String(segment.end || '') === String(selected.end || '')
      && String(segment.userName || '') === String(selected.userName || '')
    );

    const resolved = latestMatch || selected;
    if (!controller.ganttSingleLaneMode) return resolved;

    const segmentType = String(resolved.segmentType || '');
    if (!segmentType.startsWith('SYSTEM_SCHEDULED_REPROCESSING')) return resolved;

    const selectedStartTs = Date.parse(String(resolved.start || ''));
    const selectedEndTs = Date.parse(String(resolved.end || ''));
    if (!Number.isFinite(selectedStartTs) || !Number.isFinite(selectedEndTs)) return resolved;

    const sameSheetSegments = (dashboard.ganttVisibleSegments || []).filter((segment) =>
      String(segment.fileName || '') === String(resolved.fileName || '')
      && String(segment.pageName || '') === String(resolved.pageName || '')
      && String(segment.userName || '').toLowerCase() === 'system'
    );

    const overlapSource = sameSheetSegments
      .map((segment) => ({
        ...segment,
        startTs: Date.parse(String(segment.start || '')),
        endTs: Date.parse(String(segment.end || '')),
      }))
      .filter((segment) =>
        Number.isFinite(segment.startTs)
        && Number.isFinite(segment.endTs)
        && segment.segmentType === 'SYSTEM_INTERNAL_TRANSITION'
        && segment.endTs <= selectedStartTs
        && segment.endTs >= selectedStartTs - 1000
      )
      .sort((a, b) => b.startTs - a.startTs)[0];

    if (!overlapSource) return resolved;

    const mergedStartTs = Math.min(overlapSource.startTs, selectedStartTs);
    return {
      ...resolved,
      start: new Date(mergedStartTs).toISOString(),
      durationSeconds: Math.max(0, Math.round((selectedEndTs - mergedStartTs) / 1000)),
    };
  }, [controller.selectedGanttSegment, controller.ganttSingleLaneMode, dashboard.ganttVisibleSegments]);

  return (
    <>
      <DashboardLayout dashboard={dashboard} controller={controller}>
        {!dashboard.isInitialLoadDone ? (
          controller.activeView === 'data-management' ? <DataManagementLoader /> : <PanelLoader />
        ) : (
          <Suspense fallback={controller.activeView === 'data-management' ? <DataManagementLoader /> : <PanelLoader />}>
            {controller.activeView === 'data-management' ? (
            <DataManagementView
              sources={dashboard.sources}
              onUploadFiles={controller.handleUploadFiles}
              onDeleteSource={controller.handleDeleteSource}
              onConnectGSheet={controller.handleConnectGSheet}
              onDisconnectGSheet={controller.handleDisconnectGSheet}
              gsheetConnections={dashboard.gsheetConnections}
              uploading={controller.uploading}
              syncing={dashboard.syncing}
              healthInfo={dashboard.healthInfo}
            />
            ) : controller.activeView === 'system-performance' ? (
              <SystemPerformanceView segments={dashboard.ganttVisibleSegments} flowRows={dashboard.flowRows} />
            ) : (
              <DashboardView
                dashboard={dashboard}
                workloadVisibleRows={controller.workloadVisibleRows}
                showProcessBreakdownIdle={controller.showProcessBreakdownIdle}
                setShowProcessBreakdownIdle={controller.setShowProcessBreakdownIdle}
                showProcessBreakdownLabels={controller.showProcessBreakdownLabels}
                setShowProcessBreakdownLabels={controller.setShowProcessBreakdownLabels}
                mergeReviewAndEdit={controller.mergeReviewAndEdit}
                setMergeReviewAndEdit={controller.setMergeReviewAndEdit}
                ganttSingleLaneMode={controller.ganttSingleLaneMode}
                setGanttSingleLaneMode={controller.setGanttSingleLaneMode}
                showSystemLane={controller.showSystemLane}
                setShowSystemLane={controller.setShowSystemLane}
                showStarMarkers={controller.showStarMarkers}
                ganttCollapseGaps={controller.ganttCollapseGaps}
                setGanttCollapseGaps={controller.setGanttCollapseGaps}
                showGanttLegend={controller.showGanttLegend}
                setShowGanttLegend={controller.setShowGanttLegend}
                setSelectedGanttSegment={controller.setSelectedGanttSegment}
                setExpandedVisualizationId={controller.setExpandedVisualizationId}
              />
            )}
          </Suspense>
        )}
      </DashboardLayout>

      <Suspense fallback={null}>
        {resolvedSelectedGanttSegment ? (
          <SegmentDetailPopup
            segment={resolvedSelectedGanttSegment}
            onClose={() => controller.setSelectedGanttSegment(null)}
          />
        ) : null}
        {controller.expandedVisualizationId ? (
          <ExpandedVisualizationModal
            visualizationId={controller.expandedVisualizationId}
            onClose={() => controller.setExpandedVisualizationId('')}
            data={{
              ganttVisibleSegments: dashboard.ganttVisibleSegments,
              chartBaseSegments: dashboard.chartBaseSegments,
              selectedSegmentTypes: dashboard.selectedSegmentTypes,
              showProcessBreakdownIdle: controller.showProcessBreakdownIdle,
              showProcessBreakdownLabels: controller.showProcessBreakdownLabels,
              workloadVisibleRows: controller.workloadVisibleRows,
              contributionRows: dashboard.contributionRows,
              mergeReviewAndEdit: controller.mergeReviewAndEdit,
              timelineSettings: {
                singleLane: controller.ganttSingleLaneMode,
                showSystemLane: controller.showSystemLane,
                showIdleLane: dashboard.showIdle,
                showStarMarkers: controller.showStarMarkers,
                collapseGaps: controller.ganttCollapseGaps,
                showGanttLegend: controller.showGanttLegend,
              },
            }}
          />
        ) : null}
      </Suspense>
    </>
  );
}

export default App;
