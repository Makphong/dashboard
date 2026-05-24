# Dashboard (Vercel + Firebase Ready)

## Project Structure

```text
.
|- api/
|  `- index.py                 # Vercel function entrypoint
|- backend/
|  |- main.py                  # Local Python server entry
|  `- app/
|     |- api.py                # Flask routes
|     |- core.py               # Analytics and ingestion core logic
|     `- firebase_sync.py      # Firestore bridge (SQLite <-> Firestore)
|- frontend/
|  `- src/
|     `- app.jsx               # React dashboard UI
|- data/
|  `- local_dashboard.db       # Optional location if LOCAL_DB_PATH is used
|- app.py                      # Compatibility runner (python app.py)
|- index.html                  # Web entry (loads frontend/src/app.jsx)
|- requirements.txt
`- vercel.json
```

## Local Run

1. Install dependencies:
   `pip install -r requirements.txt`
2. Start server:
   `python app.py --port 8000`
3. Open:
   `http://localhost:8000/`

## Firebase Firestore Setup

Set environment variables (see `.env.example`):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` (recommended)

Optional split keys:
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_PRIVATE_KEY_ID`
- `FIREBASE_CLIENT_ID`

When Firebase env vars are present:
- App loads persisted data from Firestore into local SQLite cache on startup.
- Data changes are synced back to Firestore after upload/sync/delete actions.

Default SQLite path is `local_dashboard.db` at project root.
Set `LOCAL_DB_PATH` when you want to move it to `data/local_dashboard.db` or another path.

## Deploy on Vercel

1. Push repository to GitHub.
2. Import project in Vercel.
3. Add env vars from `.env.example` in Vercel Project Settings.
4. Deploy.

API endpoints stay under `/api/*`, and frontend is served from `/`.
