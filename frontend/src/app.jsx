import React, { Suspense, lazy, useEffect, useState } from 'react';
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
  const getRotateNoticeState = () => {
    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    return width <= 1024 && height > width;
  };
  const [showRotateNotice, setShowRotateNotice] = useState(getRotateNoticeState);

  useEffect(() => {
    const updateOrientationState = () => {
      setShowRotateNotice(getRotateNoticeState());
    };
    updateOrientationState();
    window.addEventListener('resize', updateOrientationState);
    window.addEventListener('orientationchange', updateOrientationState);
    return () => {
      window.removeEventListener('resize', updateOrientationState);
      window.removeEventListener('orientationchange', updateOrientationState);
    };
  }, []);

  if (showRotateNotice) {
    return (
      <div className="h-screen w-screen bg-[#fbfdff] flex items-center justify-center p-6 text-center">
        <div>
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-[#e8f7fd] text-[#00a4e4] flex items-center justify-center">
            <span className="text-2xl font-bold leading-none">↻</span>
          </div>
          <p className="text-base font-bold text-[#17335f]">กรุณาปรับจอเป็นแนวนอนก่อนใช้งาน</p>
        </div>
      </div>
    );
  }

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
        {controller.selectedGanttSegment ? (
          <SegmentDetailPopup
            segment={controller.selectedGanttSegment}
            onClose={() => controller.setSelectedGanttSegment(null)}
          />
        ) : null}
        {controller.expandedVisualizationId ? (
          <ExpandedVisualizationModal
            visualizationId={controller.expandedVisualizationId}
            onClose={() => controller.setExpandedVisualizationId('')}
            data={{
              ganttVisibleSegments: dashboard.ganttVisibleSegments,
              processBreakdownSegments: dashboard.filteredBaseSegments,
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
