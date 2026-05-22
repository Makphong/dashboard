# Run Without Node.js

1. Open PowerShell in this folder.
2. Start server:
   `./start.ps1`
3. Open browser:
   `http://localhost:8000/index.html`

## What this setup does
- Uses local Python server (`app.py`) + SQLite database (`local_dashboard.db`).
- Upload Excel/CSV from **Data Management** page.
- If Excel has multiple sheets, each sheet is ingested as a separate page.
- All rows are merged into one central table `unified_rows` with:
  - `file_name`
  - `page_name`
  - `row_number`
  - `data_json`
- User Performance metrics are calculated from uploaded data following PRD logic:
  - Split Active User / Idle Waiting / Scheduled Wait / Reprocess elapsed
  - Auto-timeout handling
  - Rework and bottleneck calculations