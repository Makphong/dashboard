# 📖 CODE INDEX — สารบัญโค้ด Dashboard

> **วัตถุประสงค์**: ให้ AI อ่านไฟล์นี้ก่อนเมื่อต้องแก้ไขโค้ด แทนการสแกนทั้ง Project → ประหยัด Token  
> **อัปเดตล่าสุด**: 2026-05-26

---

## Project Context Snapshot (Cross-Session)

ใช้ section นี้เป็นบริบทสั้นสำหรับ Agent ใหม่เวลาเปลี่ยน chat/session

- Product: Analytics Dashboard for workflow timeline and user/system performance
- Frontend runtime: React 18 via CDN + Tailwind CDN + Babel in-browser (no Node build)
- Backend runtime: Flask + SQLite with optional Firestore sync
- Deploy modes:
  - Local: `python app.py --port 8000` or `start.ps1`
  - Vercel: `api/index.py` as serverless entrypoint
- Main data flow:
  - Upload/GSheet → parse → `unified_rows` → normalize events → build segments → KPI/charts
- Single source docs for continuity:
  - `CODER_BRAIN.md` = strict execution rules + incident lessons
  - `CODE_INDEX.md` = code map + context + planning artifacts
  - `ARCHITECTURE_REFACTOR_PLAN.md` = phased refactor checklist
- Mandatory start order for any new Agent/Session:
  1. Read `CODER_BRAIN.md`
  2. Read `CODE_INDEX.md` (this file)
  3. Confirm `brain-read done | CODE_INDEX checked`

---

## 🗂️ โครงสร้าง Project (File Tree)

```
dashboard/
├── index.html                          # HTML entry point (97 lines) — โหลด React ผ่าน CDN + Babel
├── app.py                              # Python entry → ชี้ไปที่ backend.main
├── start.ps1                           # PowerShell script สำหรับ start server
├── vercel.json                         # Vercel deployment config
├── requirements.txt                    # Flask 3.1.1, firebase-admin 6.9.0
├── CODER_BRAIN.md                      # กฎสำหรับ AI ต้องอ่านก่อน edit ทุกครั้ง
├── CODE_INDEX.md                       # ← ไฟล์นี้ (สารบัญ)
├── local_dashboard.db                  # SQLite database (legacy path)
│
├── api/
│   └── index.py                        # Vercel serverless entry → re-export app
│
├── backend/
│   ├── __init__.py
│   ├── main.py                         # CLI entry: argparse → app.run()
│   └── app/
│       ├── __init__.py
│       ├── api.py                      # (151 lines) Flask routes
│       ├── core.py                     # (2,834 lines) ⭐ Business logic ทั้งหมด
│       └── firebase_sync.py            # (327 lines) Firestore sync
│
├── frontend/
│   └── src/
│       └── app.jsx                     # (4,515 lines) ⭐ Monolith React UI ทั้งหมด
│
└── data/                               # Empty dir สำหรับ DB path ใหม่
```

---

## 🟦 FRONTEND — `frontend/src/app.jsx` (4,515 lines)

### Architecture
- **Framework**: React 18.3 via CDN (ไม่ใช้ Node.js / build tool)
- **Styling**: TailwindCSS via CDN
- **Icons**: lucide-react
- **State**: useState/useRef/useMemo ใน App() function component
- **Rendering**: Babel in-browser transpilation (data-type="module")

### Constants & Config (L1–L230)

| Line | Name | Purpose |
|------|------|---------|
| 11 | `API_BASE` | API base URL (empty = same origin) |
| 12 | `FRONTEND_BUILD_VERSION` | Cache buster version string |
| 13 | `REOPEN_MARKER_TYPES` | Set of reopen marker segment types |
| 14 | `PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES` | Idle types treated as processing (IDLE_WAITING_FOR_SCHEDULED_REPROCESS) |
| 15–19 | `COMPLETE_MARKER_COLOR`, `REPROCESSING_SEGMENT_MERGE_GAP_MS`, `MARKER_STAR_*` | Star marker rendering config |
| 20 | `CHART_PALETTE` | 10-color palette for charts |
| 21–38 | `SEGMENT_COLORS` | Segment type → hex color mapping |
| 39–60 | `SEGMENT_TYPE_SHORT_LABELS` | Segment type → short label mapping |
| 61–82 | `GANTT_SEGMENT_DISPLAY_LABELS` | Segment type → Gantt display label |
| 84–118 | `GANTT_DRILL_GROUPS`, `GANTT_DRILL_GROUP_COLORS`, `GANTT_DRILL_GROUP_LABELS` | Gantt drill-down group config |
| 94–96 | `GANTT_MIN/MAX_ZOOM_SCALE`, `GANTT_MAX_TIMELINE_WIDTH_PX` | Zoom limits |
| 120–141 | `CORE_WORK_SESSION_TYPES`, `WORKFLOW_FLOW_SEGMENT_TYPES` | Segment type sets for KPI calculations |
| 143–164 | `SYSTEM_STAGE_FILTER_GROUPS` | Filter bucket definitions (initial-processing, repeat-processing, system-handoff, waiting) |
| 166–187 | `FLOW_INSIGHT_GROUPS` | Flow analysis group definitions |
| 189–223 | `TRANSITION_FRIENDLY_LABELS` | Raw transition key → human-readable label |
| 224–230 | `initialKpiData` | Default KPI card data before data load |

### Utility Functions (L232–L662)

| Line | Function | Purpose |
|------|----------|---------|
| 232 | `KpiSubtext` | Component: renders KPI subtext with `\|` delimiter support |
| 248 | `requestJson(path, options)` | Fetch wrapper with JSON parsing |
| 268 | `toDisplayDate(value)` | ISO → locale string |
| 275 | `toExcelDateTime(value)` | ISO → Excel datetime format |
| 283 | `escapeHtml(value)` | HTML entity escape |
| 292 | `downloadExcelTable(filename, sheetTitle, columns, rows)` | Generate & download .xls file |
| 326 | `formatDuration(seconds)` | Seconds → human string (e.g., "2h 15m") |
| 360 | `formatPercent(value)` | Decimal → percentage string |
| 364 | `safeNumber(value)` | Safe number parser |
| 369 | `clampPercent(value)` | Clamp 0–100 |
| 373 | `percentile(values, ratio)` | Compute percentile from array |
| 384 | `formatTimeTick(value)` | Format for timeline axis |
| 396 | `formatTickHeader(value)` | Format date+time for header |
| 406 | `isSameCalendarDay(aTs, bTs)` | Compare two timestamps |
| 414 | `toSegmentTypeLabel(segmentType)` | Segment type → display label |
| 423 | `toGanttSegmentTypeLabel(segmentType)` | Segment type → Gantt label |
| 429 | `isProcessingEquivalentIdleSegment(segmentType)` | Check if idle segment is treated as processing |
| 434 | `isReprocessingSegmentType(segmentType)` | Check if segment is reprocessing-class |
| 441 | `toDisplaySegmentTypeCode(segmentType)` | Map marker/idle types to display-equivalent |
| 450 | `toCompleteMarkerType(segmentOrType)` | Determine which complete marker type |
| 460 | `mergeContinuousReprocessingSegments(sorted)` | Merge adjacent reprocessing segments |
| 505 | `toDrillGroup(segmentType)` | Segment type → drill group name |
| 526 | `toTimelineLane(segmentType, userName)` | Segment type → timeline lane name |
| 536 | `isIdleContextSegment(segmentType)` | Check if true idle (not processing-equivalent) |
| 542 | `isUserContextSegment(segmentType, userName)` | Check if user-owned segment |
| 552 | `buildAsteriskPoints(cx, cy, ...)` | SVG star polygon points |
| 563 | `spreadMarkerPositions(markerItems, minGap)` | Prevent overlapping star markers |
| 598 | `buildSheetKey(fileName, pageName)` | Composite key "file::page" |
| 604 | `extractFileNameFromSheetKey(sheetKey)` | Extract file name from composite key |
| 611 | `buildKpiData(kpis)` | Build KPI card array from API response |
| 664 | `buildKpisFromSegments(segments)` | Compute KPIs client-side from segment data |

### UI Components (L747–L2341)

| Line | Component | Purpose |
|------|-----------|---------|
| 747 | `Sidebar` | Left navigation sidebar (User Performance / System Performance / Data Management) |
| 821 | `FilterPopover` | Dropdown multi-select filter with search |
| 916 | `DropdownSearch` | Reusable search input for dropdowns |
| 928 | `EmptyState` | Empty data placeholder component |
| 936 | `GanttTimelineChart` | ⭐ **ใหญ่ที่สุด** (~600 lines) Timeline visualization ด้วย SVG, zoom/pan, lanes, markers |
| 1536 | `DurationBarChart` | Horizontal bar chart for duration data |
| 1576 | `SystemProcessingTrendChart` | Line/area chart for system processing trend |
| 1638 | `SystemParetoChart` | Pareto bar chart for system bottlenecks |
| 1749 | `SystemBottleneckTable` | Table view of system bottleneck data |
| 1783 | `FlowDelayComparisonTable` | Flow delay comparison table |
| 1823 | `DonutWorkloadChart` | ⭐ Donut chart for workload distribution |
| 1941 | `UserContributionStackChart` | Stacked bar chart per user |
| 2004 | `ReworkMatrixScatterChart` | Scatter plot for rework analysis |
| 2109 | `DataManagementView` | ⭐ Full data management page (upload, gsheet connect, delete) |

### Main App Component (L2342–L4503)

| Line Range | Section | Description |
|------------|---------|-------------|
| 2342–2382 | **State declarations** | ~40 useState hooks สำหรับ UI state ทั้งหมด |
| 2384–2500 | **parsedSegments useMemo** | Transform raw segments → enriched objects with timestamps, labels, drill groups |
| 2500–2700 | **Filter logic** | fileOptions, sheetOptions, filtered segments by date/file/sheet/user/type/stage |
| 2700–2850 | **Computed data** | KPIs, chart data, contribution rows, flow rows |
| 2850–3000 | **useEffect hooks** | Data fetching (sources, performance, health, debug) |
| 3000–3100 | **Handler functions** | handleUploadFiles, handleDeleteSource, handleConnectGSheet, etc. |
| 3100–4503 | **JSX render** | Full page layout with header, filters, KPI cards, charts, timeline, detail panels |

### Key State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `sources` | Array | Uploaded data sources |
| `gsheetConnections` | Array | Connected Google Sheets |
| `performance` | Object | Full API response from /api/user-performance |
| `selectedGanttSegment` | Object\|null | Currently clicked timeline segment |
| `expandedVisualizationId` | String | ID of expanded chart modal |
| `ganttSingleLaneMode` | Boolean | Single lane timeline mode |
| `showIdle` | Boolean | Show/hide idle segments |
| `activeView` | String | Current page: 'user-performance' or 'data-management' |
| `selectedFiles/Sheets/Users/SegmentTypes/SystemStages` | Array | Active filter selections |
| `datePreset/dateStart/dateEnd` | String | Date range filter |

---

## 🟩 BACKEND — `backend/app/core.py` (2,225 lines)

### Architecture
- **Framework**: Flask (used via api.py)
- **Database**: SQLite (local_dashboard.db)
- **Sync**: Optional Firebase Firestore sync
- **Processing**: Full audit-trail event → timeline segment pipeline

### Constants & Config (L1–L282)

| Line | Name | Purpose |
|------|------|---------|
| 28–38 | `PROJECT_ROOT`, `DB_PATH`, etc. | Path resolution & DB location |
| 39 | `DEFAULT_TIMEOUT_SECONDS` | 30 min default |
| 40 | `APP_VERSION` | Backend version string |
| 42–44 | `ALGORITHM_VERSION` | Segmentation algorithm identifier |
| 53–65 | `WORKFLOW_STATE_ORDER`, `WORKFLOW_STATES`, `PENDING_STATES` | Workflow state definitions |
| 67–81 | `SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES`, `USER_EDIT_CHANGE_TYPES` | Change type classification sets |
| 83–104 | `SYSTEM_TIME_SEGMENT_TYPES`, `USER_TIME_SEGMENT_TYPES`, `IDLE_TIME_SEGMENT_TYPES` | Segment type group sets |
| 106–112 | `CORE_USER_SESSION_SEGMENT_TYPES` | Core session types for KPI |
| 114–131 | `SESSION_TIMEOUT_MINUTES_DEFAULT`, status sets | Timeout and status bucket constants |
| 133–151 | `DATE_NUMBER_FORMAT_IDS` | Excel date format IDs |
| 153–262 | `FIELD_ALIASES` | Column name normalization (maps various CSV header names to canonical names) |
| 264–282 | `CSV_DECODE_CANDIDATES`, `MOJIBAKE_MARKERS` | Encoding detection config |

### Utility Functions (L285–L463)

| Line | Function | Purpose |
|------|----------|---------|
| 285 | `utc_now_iso()` | Current UTC ISO string |
| 289 | `normalize_key(value)` | Strip to lowercase alphanumeric |
| 293 | `normalize_text(value)` | Same as normalize_key with None handling |
| 299 | `canonicalize_workflow_state(value)` | Raw status → canonical state name |
| 318 | `status_bucket(status)` | Status → bucket key |
| 336 | `looks_like_workflow_status(value)` | Check if value is a workflow status |
| 340 | `normalize_workflow_status(value)` | Alias for canonicalize |
| 344 | `is_upload_status(value)` | Check if uploading state |
| 349 | `infer_actor_type(actor_type, actor_name)` | Determine "System" or "User" |
| 361 | `seconds_between(end, start)` | Duration in seconds |
| 365 | `parse_bool(value)` | Flexible boolean parser |
| 374 | `parse_int(value)` | Safe int parser |
| 383 | `parse_datetime(value)` | Multi-format datetime parser |
| 427 | `format_duration(seconds)` | Seconds → "Xh Ym" |
| 438 | `format_percent(value)` | Decimal → "X.X%" |
| 442 | `excel_serial_to_datetime(serial)` | Excel serial → datetime |
| 448 | `col_to_index(col)` / `index_to_col(index)` | Excel column letter ↔ number |

### Database Layer (L465–L570)

| Line | Function | Purpose |
|------|----------|---------|
| 465 | `get_conn()` | Get SQLite connection |
| 472 | `current_unified_rows_signature(conn)` | Cache key: (count, max_row_id) |
| 489 | `invalidate_runtime_caches()` | Clear all in-memory caches |
| 498 | `_bootstrap_from_firestore_if_needed()` | One-time Firestore → SQLite hydration |
| 513 | `_sync_to_firestore_if_enabled()` | SQLite → Firestore push |
| 522 | `init_db()` | Create tables + bootstrap |

**Tables:**
- `source_files` — uploaded file metadata
- `source_pages` — per-sheet/page info
- `unified_rows` — normalized row data (JSON)
- `connected_sheets` — Google Sheet connections

### File Parsing (L573–L870)

| Line | Function | Purpose |
|------|----------|---------|
| 573 | `is_date_number_format(code)` | Check Excel format code |
| 579 | `parse_shared_strings(zf)` | XLSX shared strings XML parser |
| 592 | `parse_date_style_indexes(zf)` | XLSX style date detection |
| 617 | `parse_cell_value(cell, ...)` | XLSX cell → Python value |
| 665 | `dedupe_headers(headers)` | Handle duplicate column names |
| 682 | `detect_header_row(rows)` | Auto-detect header row in sheet |
| 693 | `parse_xlsx_bytes(payload)` | ⭐ Full XLSX parser (no openpyxl) |
| 777 | `score_text_quality(text)` | Mojibake/encoding quality scorer |
| 798 | `decode_csv_payload(payload)` | Auto-detect CSV encoding |
| 816 | `parse_csv_bytes(payload)` | CSV → list[dict] |
| 842 | `parse_uploaded_file(file_name, payload)` | Route to XLSX or CSV parser |
| 855 | `clear_source_by_file_name(conn, name)` | Delete existing source by name |

### Google Sheets Integration (L868–L1200)

| Line | Function | Purpose |
|------|----------|---------|
| 868 | `_extract_gsheet_id(url)` | Extract spreadsheet ID from URL |
| 879 | `_extract_gsheet_gid(url)` | Extract sheet GID from URL |
| 896 | `_fetch_url_bytes(url)` | HTTP GET with timeout |
| 906 | `_discover_gsheet_gids(spreadsheet_id)` | Discover all sheet tabs |
| 944 | `_download_gsheet_pages(spreadsheet_id, gids)` | Download sheets as CSV |
| 1008 | `_ingest_gsheet_pages(conn, source_id, ...)` | Insert GSheet data into DB |
| 1050 | `connect_gsheet(url)` | ⭐ Connect & import Google Sheet |
| 1114 | `_sync_single_gsheet(connection_row)` | Re-sync single connection |
| 1145 | `sync_all_gsheets()` | Sync all connected sheets |
| 1161 | `disconnect_gsheet(connection_id)` | Remove connection |
| 1178 | `list_gsheet_connections()` | List all connections |

### Data CRUD (L1200–L1360)

| Line | Function | Purpose |
|------|----------|---------|
| 1204 | `ingest_file(file_name, payload)` | ⭐ Upload & parse file → DB |
| 1255 | `list_sources()` | List all uploaded sources |
| 1291 | `delete_source(source_id)` | Delete source + cascade |
| 1300 | `build_canonical_map(row)` | Row → canonical field map |
| 1307 | `pick_field(canonical, ...)` | Pick field value by priority |
| 1317 | `assign_time_group(segment_type)` | Segment type → time group |

### Event Normalization (L1359–L1530)

| Line | Function | Purpose |
|------|----------|---------|
| 1359 | `fetch_normalized_events(signature)` | ⭐ **Core pipeline**: raw DB rows → normalized events with caching |
| 1483 | `is_system_evidence(event)` | Check if event is system-generated evidence |
| 1512 | `first_system_evidence(events)` | Find first system evidence event |
| 1519 | `previous_system_event_before(events, idx)` | Find prior system event |
| 1532 | `next_system_detail_after(events, idx)` | Find next system detail event |
| 1545 | `last_system_event_after(events, idx)` | Find last system event after index |

### Segmentation Engine (L1556–L2160)

| Line | Function | Purpose |
|------|----------|---------|
| 1556 | `find_system_reprocess_cycle_end(events, start_idx)` | Find end of reprocess cycle |
| 1594 | `calculate_effective_user_duration(interval, is_auto_timeout)` | Timeout-aware duration calc |
| 1618 | `is_same_timestamp_reopen_to_review_handoff(interval)` | Zero-duration reopen detection |
| 1631 | `build_segment(interval, ...)` | ⭐ Single interval → segment dict |
| 1706 | `segment_events_between(events, start, end)` | Slice events in time range |
| 1718 | `build_interval_segments(interval, all_events)` | ⭐ **Complex**: interval → multiple segments with sub-classification |
| 2019 | `resolve_overlaps(segments)` | Trim overlapping segment durations |
| 2061 | `build_segments_for_document(doc_events)` | ⭐ **Main entry**: document events → full segment list |
| 2161 | `countable_segment_seconds(segment)` | Get effective countable seconds |

### Analytics & API Response (L2172–L2470)

| Line | Function | Purpose |
|------|----------|---------|
| 2172 | `empty_user_performance_response()` | Empty response template |
| 2208 | `compute_user_performance()` | ⭐ **Main API handler**: builds full dashboard response (KPIs, segments, contribution, flow, matrix) |
| 2469 | `_counter_to_rows(counter, limit)` | Counter → sorted row list |

### Debug & Health (L2476–L2600)

| Line | Function | Purpose |
|------|----------|---------|
| 2476 | `build_debug_snapshot()` | Full debug info (events, segments, raw rows) |
| 2579 | `build_health_payload()` | Health check response |

### Standalone HTTP Server (L2593–L2834)

| Line | Function | Purpose |
|------|----------|---------|
| 2593 | `json_response(handler, ...)` | HTTP response helper |
| 2604 | `read_json_body(handler)` | Parse POST body |
| 2612 | `DashboardHandler` | ⭐ Standalone HTTP handler (no Flask needed) |
| 2809 | `run_server(port)` | Start ThreadingHTTPServer |
| 2823 | `main()` | CLI entry point |

---

## 🟨 BACKEND — `backend/app/api.py` (285 lines)

Flask app factory with routes:

| Method | Route | Handler | Purpose |
|--------|-------|---------|---------|
| GET | `/api/health` | `api_health` | Health check |
| GET | `/api/sources` | `api_sources` | List data sources |
| GET | `/api/debug` | `api_debug` | Debug snapshot |
| GET | `/api/user-performance` | `api_user_performance` | ⭐ Main analytics endpoint |
| GET | `/api/gsheet/connections` | `api_gsheet_connections` | List GSheet connections |
| POST | `/api/upload` | `api_upload` | Upload files (base64) |
| POST | `/api/gsheet/connect` | `api_gsheet_connect` | Connect Google Sheet |
| POST | `/api/gsheet/sync` | `api_gsheet_sync` | Sync all sheets |
| DELETE | `/api/sources/<id>` | `api_source_delete` | Delete source |
| DELETE | `/api/gsheet/<id>` | `api_gsheet_delete` | Disconnect sheet |
| GET | `/` | `web_index` | Serve index.html |
| GET | `/frontend/src/<path>` | `web_frontend_src` | Serve frontend files |
| GET | `/<path>` | `web_static` | Serve static / fallback |

---

## 🟧 BACKEND — `backend/app/firebase_sync.py` (278 lines)

| Line | Function | Purpose |
|------|----------|---------|
| 29 | `is_firestore_enabled()` | Check env vars for Firebase config |
| 44 | `_get_service_account_dict()` | Build service account from env vars |
| 76 | `_get_client()` | Lazy-init Firestore client |
| 121 | `sync_sqlite_to_firestore(db_path)` | Full SQLite → Firestore push (batch write) |
| 213 | `hydrate_sqlite_from_firestore(db_path)` | Full Firestore → SQLite pull (bootstrap) |

---

## 🔄 Data Flow

```
[Upload File / Connect GSheet]
        ↓
    parse_uploaded_file()     ← XLSX/CSV parser
        ↓
    ingest_file()             ← Store in unified_rows
        ↓
    fetch_normalized_events() ← DB → normalized events (cached)
        ↓
    build_segments_for_document() ← Events → timeline segments
        ↓
    compute_user_performance()    ← Segments → KPIs + charts
        ↓
    /api/user-performance         ← JSON response
        ↓
    App() → parsedSegments        ← useMemo transforms
        ↓
    GanttTimelineChart / Charts   ← SVG rendering
```

---

## 🏷️ Quick Reference: "แก้อะไร ดูที่ไหน"

| ต้องการแก้ | ไฟล์ | Line Range |
|-----------|------|------------|
| สี segment | `app.jsx` | L21–38 (`SEGMENT_COLORS`) |
| ชื่อ label | `app.jsx` | L39–82 (`SEGMENT_TYPE_SHORT_LABELS`, `GANTT_SEGMENT_DISPLAY_LABELS`) |
| KPI cards | `app.jsx` | L611–745 (`buildKpiData`, `buildKpisFromSegments`) |
| Timeline chart | `app.jsx` | L936–1535 (`GanttTimelineChart`) |
| Donut chart | `app.jsx` | L1823–1940 (`DonutWorkloadChart`) |
| Filter dropdowns | `app.jsx` | L821–926 (`FilterPopover`) |
| Data management page | `app.jsx` | L2109–2341 (`DataManagementView`) |
| Filter logic | `app.jsx` | L2500–2700 (ใน App function) |
| Data fetch | `app.jsx` | L2850–3000 (useEffect hooks) |
| Sidebar nav | `app.jsx` | L747–820 (`Sidebar`) |
| API routes | `api.py` | L1–285 (ทั้งไฟล์) |
| File parsing | `core.py` | L573–870 |
| Segment classification | `core.py` | L1317–1360 (`assign_time_group`) + L1631–2060 |
| Event normalization | `core.py` | L1359–1530 (`fetch_normalized_events`) |
| Segmentation algorithm | `core.py` | L1718–2060 (`build_interval_segments`, `build_segments_for_document`) |
| KPI calculation (backend) | `core.py` | L2208–2466 (`compute_user_performance`) |
| Google Sheets | `core.py` | L868–1200 |
| Firebase sync | `firebase_sync.py` | ทั้งไฟล์ (327 lines) |
| Workflow states | `core.py` | L53–65 + L299–342 |
| DB schema | `db/sqlite_store.py` | L60–104 (`init_db`) |

---

## Instruction Update Log

- 2026-05-26: Simplified agent instruction docs to mandatory rules only.
- Updated files: `AGENTS.md`, `CLAUDE.md`, `.gemini/styleguide.md`.
- Enforced rules:
  1. Read `CODER_BRAIN.md` and `CODE_INDEX.md` before every task, and follow `CODER_BRAIN.md` strictly.
  2. Update `CODE_INDEX.md` after every completed task.
  3. Record feedback in `CODER_BRAIN.md` whenever a request must be repeated due to incorrect execution, or when errors/debug incidents occur.
- 2026-05-26: Updated all 3 agent instruction files to require reading `.aiignore` before every task and respecting AI ignore rules.

---

## Planning Artifacts

- `ARCHITECTURE_REFACTOR_PLAN.md`
  - Purpose: phased architecture remediation checklist for step-by-step execution.
  - Added: 2026-05-26

---

## Brain Feedback Updates

- 2026-05-26: Added `Feedback Log` entry in `CODER_BRAIN.md` for:
  - encoding corruption incident handling (`CODE_INDEX.md`)
  - Git lock/permission fallback workflow
- 2026-05-26: Added recurrence RCA in `CODER_BRAIN.md` for encoding issue:
  - root cause expanded to nested PowerShell stdin pipeline (`@'... '@ | powershell -Command -`)
  - added hard rule to use `apply_patch` only for multilingual markdown edits
  - added immediate post-edit Unicode sanity check gate

---

## AI Ignore Policy

- `2026-05-26`: Added `.aiignore` to reduce AI input-token waste on non-logic files.
- Primary blocked groups:
  - caches/build outputs (`__pycache__/`, `build/`, `dist/`, `.next/`, `coverage/`)
  - dependency artifacts (`node_modules/`, lockfiles)
  - local data/binaries (`*.db`, `local_dashboard.db`, image/video/archive binaries)
  - VCS/editor/deploy metadata (`.git/`, `.vscode/`, `.vercel/`)

---

## Phase 0 Execution Log

- `2026-05-26`: Started and executed Phase 0 baseline setup from `ARCHITECTURE_REFACTOR_PLAN.md`.
- `2026-05-26`: Team confirmation received; Phase 0 marked complete in `ARCHITECTURE_REFACTOR_PLAN.md`.
- Generated artifacts under `artifacts/phase0/`:
  - `README.md`
  - `baseline_api/` (`/api/health`, `/api/sources`, `/api/user-performance`, `/api/debug` + manifest/hash)
  - `metrics_lock.json`
  - `sample_data/sample_small_replay.csv`
  - `sample_data/sample_medium_replay.csv`
  - `smoke_checklist.md`
  - `assumptions.md`
  - `regression_policy.md`
  - `regression_log.md`

---

## Phase 1 Execution Log

- `2026-05-26`: Executed Phase 1 from `ARCHITECTURE_REFACTOR_PLAN.md` and marked checklist + exit criteria complete.
- Security/API changes:
  - `backend/app/api.py`: static allowlist + traversal protection + API/static separation + write endpoint auth guard + upload size/shape limits
  - `vercel.json`: route allowlist for static assets and explicit API routing before SPA fallback
  - `README.md`: production auth setup (`DASHBOARD_WRITE_TOKEN`) and upload guard env vars
- Validation summary:
  - Flask test-client smoke checks passed for `/api/health`, `/api/sources`, `/api/user-performance`, `/frontend/src/app.jsx`, SPA fallback route
  - Traversal/static block checks returned `404` as expected (`/README.md`, `/..%2FREADME.md`)
  - With `DASHBOARD_WRITE_TOKEN` set: write endpoint without token returned `401`, with valid bearer token returned success

---

## Phase 2 Execution Log (In Progress)

- `2026-05-26`: Continued Phase 2 backend modularization with no intended behavior changes.
- Structural changes completed in this pass:
  - Added `backend/app/contracts/constants.py` and moved path/config/workflow/parser constants out of `core.py`.
  - Added `backend/app/db/sqlite_store.py` and moved DB connection + signature + schema init + Firestore bootstrap/sync wiring out of `core.py`.
  - Updated `backend/app/core.py` to import constants and DB primitives from the new modules while keeping existing call-sites/contract shape.
- Validation completed:
  - `python -m compileall backend/app` passed.
  - Flask test-client smoke checks passed for `/api/health`, `/api/sources`, `/api/user-performance`, `/api/debug`.
  - Baseline top-level response key set matched Phase 0 artifacts for `api_health`, `api_sources`, `api_user_performance`, `api_debug`.
