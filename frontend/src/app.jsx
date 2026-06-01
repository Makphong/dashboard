import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useAppController } from './hooks/useAppController.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { DashboardLayout } from './features/dashboard/DashboardLayout.jsx';
import { DashboardView } from './features/dashboard/DashboardView.jsx';
import { DataManagementView } from './features/data-management/DataManagementView.jsx';
import { SystemPerformanceView } from './features/dashboard/views/SystemPerformanceView.jsx';
import { ExpandedVisualizationModal } from './features/dashboard/components/ExpandedVisualizationModal.jsx';
import { ExportConfirmModal } from './features/dashboard/components/ExportConfirmModal.jsx';
import { SegmentDetailPopup } from './features/dashboard/components/SegmentDetailPopup.jsx';

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

  if (!dashboard.isInitialLoadDone) {
    return (
      <div className="h-screen w-screen bg-[#fbfdff] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-9 w-9 rounded-full border-4 border-slate-200 border-t-[#00a4e4] animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout dashboard={dashboard} controller={controller}>
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
            setSelectedGanttSegment={controller.setSelectedGanttSegment}
            setExpandedVisualizationId={controller.setExpandedVisualizationId}
            setShowExportConfirm={controller.setShowExportConfirm}
          />
        )}
      </DashboardLayout>

      <SegmentDetailPopup
        segment={controller.selectedGanttSegment}
        onClose={() => controller.setSelectedGanttSegment(null)}
      />
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
        }}
      />
      <ExportConfirmModal
        isOpen={controller.showExportConfirm}
        onClose={() => controller.setShowExportConfirm(false)}
        onConfirm={controller.confirmExportTimeline}
        count={dashboard.ganttVisibleSegments.length}
      />
    </>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
