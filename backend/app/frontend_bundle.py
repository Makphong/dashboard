from __future__ import annotations

import re
from pathlib import Path

FILES_TO_BUNDLE = [
    "lib/constants.js",
    "lib/numberUtils.js",
    "lib/durationFormatters.js",
    "lib/dateFormatters.js",
    "lib/excelExport.js",
    "lib/segmentUtils.js",
    "lib/kpiUtils.js",
    "lib/api.js",
    "hooks/dashboard/utils/segmentData.js",
    "hooks/dashboard/utils/dataParsers.js",
    "hooks/dashboard/hooks/useDashboardFilters.js",
    "hooks/dashboard/hooks/useDashboardMetrics.js",
    "hooks/dashboard/hooks/useDashboardDerivedData.js",
    "hooks/dashboard/utils/dashboardApi.js",
    "hooks/usePersistentState.js",
    "hooks/useDashboardData.js",
    "hooks/useAppController.js",
    "components/shared/KpiSubtext.jsx",
    "components/shared/Sidebar.jsx",
    "components/shared/FilterPopover.jsx",
    "components/shared/DropdownSearch.jsx",
    "components/shared/EmptyState.jsx",
    "features/dashboard/FilterBar.jsx",
    "features/timeline/timelineUtils.js",
    "features/timeline/ganttLayoutUtils.js",
    "features/timeline/GanttTimelineParts.jsx",
    "features/timeline/GanttTimelineChart.jsx",
    "features/charts/DurationBarChart.jsx",
    "features/charts/SystemProcessingTrendChart.jsx",
    "features/charts/SystemParetoChart.jsx",
    "features/charts/SystemBottleneckTable.jsx",
    "features/charts/FlowDelayComparisonTable.jsx",
    "features/charts/DonutWorkloadChart.jsx",
    "features/charts/UserContributionStackChart.jsx",
    "features/charts/ReworkMatrixScatterChart.jsx",
    "features/charts/ProcessTimeBreakdownChart.jsx",
    "features/data-management/DataManagementView.jsx",
    "features/dashboard/DashboardLayout.jsx",
    "features/dashboard/DashboardView.jsx",
    "features/dashboard/views/SystemPerformanceView.jsx",
    "features/dashboard/components/ExpandedVisualizationModal.jsx",
    "features/dashboard/components/ExportConfirmModal.jsx",
    "features/dashboard/components/SegmentDetailPopup.jsx",
    "app.jsx",
]

HEADER_LINES = [
    "// AUTO-GENERATED FAIL-SAFE BUNDLE",
    "import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';",
    "import { createRoot } from 'react-dom/client';",
    "import { createPortal } from 'react-dom';",
    "import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';",
    "import { ",
    "  Users, Server, Clock, Timer, RefreshCw, AlertTriangle, Star, Search, ",
    "  Calendar, LayoutDashboard, Menu, X, ChevronLeft, ChevronRight, Database, ",
    "  UploadCloud, Link2, FileText, FileSpreadsheet, Trash2, CheckCircle2, ",
    "  Plus, Maximize2, SlidersHorizontal, Eye, EyeOff, ChevronDown, User, Pin",
    "} from 'lucide-react';",
    "\n",
]

IMPORT_PATTERN = re.compile(
    r'^import\s+.*?\s+from\s+[\'"].*?[\'"];?',
    re.DOTALL | re.MULTILINE,
)


def build_frontend_bundle(project_root: Path, cache: dict) -> tuple[str, str]:
    src_dir = project_root / "frontend" / "src"

    bundle_signature = []
    for rel_path in FILES_TO_BUNDLE:
        file_path = src_dir / rel_path
        if not file_path.exists():
            bundle_signature.append((rel_path, None, None))
            continue
        stat = file_path.stat()
        bundle_signature.append((rel_path, stat.st_mtime_ns, stat.st_size))
    bundle_signature = tuple(bundle_signature)

    if (
        cache["signature"] == bundle_signature
        and cache["content"] is not None
    ):
        return cache["content"], "hit"

    bundle_body = []
    for rel_path in FILES_TO_BUNDLE:
        file_path = src_dir / rel_path
        if not file_path.exists():
            continue

        content = file_path.read_text(encoding="utf-8")
        clean_content = IMPORT_PATTERN.sub("", content)

        processed_lines = []
        for line in clean_content.splitlines():
            stripped = line.strip()
            if stripped.startswith("export "):
                if stripped.startswith("export default "):
                    continue
                line = line.replace("export ", "", 1)
            processed_lines.append(line)

        bundle_body.append(f"// --- {rel_path} ---")
        bundle_body.extend(processed_lines)
        bundle_body.append("\n")

    final_content = "\n".join(HEADER_LINES + bundle_body)
    cache["signature"] = bundle_signature
    cache["content"] = final_content
    return final_content, "miss"
