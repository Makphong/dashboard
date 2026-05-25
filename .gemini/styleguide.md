# Gemini Code Assist — Repository Instructions

## ⚠️ MANDATORY: Read Before Every Task

Before writing or modifying ANY code in this repository, you MUST read these two files first:

1. **`CODER_BRAIN.md`** — Contains rules, lessons from past AI mistakes, and non-negotiable execution guidelines. This file prevents repeated errors.
2. **`CODE_INDEX.md`** — Contains the full code index with file structure, function line numbers, and "what to edit where" quick reference. Use this INSTEAD of scanning the entire project to save tokens.

## Verification Checkpoint

After reading both files, you MUST confirm at the start of your response:
```
✅ brain-read done | CODE_INDEX checked
```
If this line is missing, the user will reject and ask you to restart.

## Project Overview

- **Type**: Analytics Dashboard (Workflow timeline analysis)
- **Frontend**: React 18 via CDN (no Node.js build), TailwindCSS CDN, Babel in-browser
- **Backend**: Python Flask, SQLite, optional Firebase Firestore sync
- **Deployment**: Vercel (serverless) or local (start.ps1)

## Critical Files

| File | Lines | Role |
|------|-------|------|
| `frontend/src/app.jsx` | 4,515 | ⭐ Monolith — ALL frontend UI, charts, state, logic |
| `backend/app/core.py` | 2,834 | ⭐ Monolith — ALL backend business logic, parsing, segmentation |
| `backend/app/api.py` | 151 | Flask API routes |
| `backend/app/firebase_sync.py` | 327 | Firestore sync module |
| `index.html` | 97 | HTML entry point |
| `CODER_BRAIN.md` | ~126 | AI behavior rules & lessons learned |
| `CODE_INDEX.md` | ~398 | Full code table of contents |

## Key Rules (Summary from CODER_BRAIN.md)

1. Do exactly what the user asks. Do not add extra behavior.
2. If user says "A, not B", enforce both parts explicitly.
3. Do not reinterpret wording into a different UI behavior.
4. Edit only files/areas required for the request.
5. Never do broad Git rollback when user asks to revert only one area.
6. Always scan for mojibake/encoding corruption before reporting done:
   - `rg -n "à¸|à¹|Ã|Â|â" --glob "*.js" --glob "*.jsx" --glob "*.py" --glob "*.md" --glob "*.html" --glob "*.css" .`
7. For state reclassification, verify all 5 layers: classification, labels, tooltip, KPI, visual merge.
8. For filter persistence, verify: reload keeps selection, empty data doesn't clear selection, intentional clear saves correctly.
9. If uncertain, ask one short clarification — do not guess.

## Code Navigation (Summary from CODE_INDEX.md)

### Frontend (app.jsx)
- **Constants/Config**: L1–230 (colors, labels, segment types)
- **Utilities**: L232–662 (formatDuration, KPI builders, segment helpers)
- **GanttTimelineChart**: L936–1535 (⭐ largest component, SVG timeline)
- **Charts**: L1536–2108 (DurationBar, Pareto, Donut, Scatter, etc.)
- **DataManagementView**: L2109–2341 (upload/connect page)
- **App() state**: L2342–2382 (~40 useState hooks)
- **Filter logic**: L2500–2700
- **Data fetch**: L2850–3000 (useEffect hooks)
- **JSX render**: L3100–4503

### Backend (core.py)
- **Constants**: L1–282 (workflow states, field aliases, encoding config)
- **Utilities**: L285–463 (parse_datetime, format_duration, etc.)
- **Database**: L465–570 (init_db, get_conn, caching)
- **File parsing**: L573–870 (XLSX/CSV parsers)
- **Google Sheets**: L868–1200 (connect, sync, download)
- **Data CRUD**: L1200–1360 (ingest, list, delete)
- **Event normalization**: L1359–1530 (fetch_normalized_events)
- **Segmentation engine**: L1556–2160 (build_interval_segments, build_segments_for_document)
- **Analytics API**: L2208–2466 (compute_user_performance — main endpoint)
- **Debug/Health**: L2476–2600

### Data Flow
```
Upload/GSheet → parse → ingest_file() → unified_rows DB
→ fetch_normalized_events() → build_segments_for_document()
→ compute_user_performance() → /api/user-performance
→ App() parsedSegments → GanttTimelineChart / Charts
```

## Quick Reference: What to Edit Where

| Task | File | Lines |
|------|------|-------|
| Segment colors | `app.jsx` | L21–38 |
| Label names | `app.jsx` | L39–82 |
| KPI cards | `app.jsx` | L611–745 |
| Timeline chart | `app.jsx` | L936–1535 |
| Donut chart | `app.jsx` | L1823–1940 |
| Filter dropdowns | `app.jsx` | L821–926 |
| Data management | `app.jsx` | L2109–2341 |
| API routes | `api.py` | L1–151 |
| File parsing | `core.py` | L573–870 |
| Segmentation | `core.py` | L1718–2060 |
| KPI backend | `core.py` | L2208–2466 |
| DB schema | `core.py` | L522–568 |
