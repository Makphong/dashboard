# Phase 0 Smoke Checklist

Generated baseline-oriented smoke checklist for this repo.

## Backend/API Smoke (Completed)
- [x] `/api/health` responds with JSON
- [x] `/api/sources` responds with JSON
- [x] `/api/user-performance` responds with JSON
- [x] `/api/debug` responds with JSON

## UI Smoke (Manual Replay Checklist)
- [ ] Open dashboard home page
- [ ] Verify filters render (date/file/sheet/user/type/stage)
- [ ] Verify timeline renders with current data
- [ ] Verify KPI cards render values
- [ ] Upload `sample_small_replay.csv` and confirm source appears
- [ ] Upload `sample_medium_replay.csv` and confirm source appears
- [ ] Delete uploaded sample source and confirm list updates

## Notes
- API smoke above executed via Flask test client (no browser dependency).
- UI items are prepared for deterministic manual replay during refactor phases.
