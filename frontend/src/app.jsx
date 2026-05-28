import React from 'react';
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

  return (
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
        />
      ) : controller.activeView === 'system-performance' ? (
        <SystemPerformanceView segments={dashboard.ganttVisibleSegments} flowRows={dashboard.flowRows} />
      ) : (
        <DashboardView
          dashboard={dashboard}
          workloadVisibleRows={controller.workloadVisibleRows}
          showMatrixQuadrants={controller.showMatrixQuadrants}
          setShowMatrixQuadrants={controller.setShowMatrixQuadrants}
          setSelectedGanttSegment={controller.setSelectedGanttSegment}
          setExpandedVisualizationId={controller.setExpandedVisualizationId}
          setShowExportConfirm={controller.setShowExportConfirm}
        />
      )}

      <SegmentDetailPopup
        segment={controller.selectedGanttSegment}
        onClose={() => controller.setSelectedGanttSegment(null)}
      />
      <ExpandedVisualizationModal
        visualizationId={controller.expandedVisualizationId}
        onClose={() => controller.setExpandedVisualizationId('')}
        data={{
          ganttVisibleSegments: dashboard.ganttVisibleSegments,
          workloadVisibleRows: controller.workloadVisibleRows,
          flowRows: dashboard.flowRows,
          contributionRows: dashboard.contributionRows,
          matrixRows: dashboard.matrixRows,
          showMatrixQuadrants: controller.showMatrixQuadrants,
        }}
      />
      <ExportConfirmModal
        isOpen={controller.showExportConfirm}
        onClose={() => controller.setShowExportConfirm(false)}
        onConfirm={controller.confirmExportTimeline}
        count={dashboard.ganttVisibleSegments.length}
      />
    </DashboardLayout>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
