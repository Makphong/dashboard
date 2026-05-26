# Phase 0 Regression Log

## 2026-05-26T00:10:46Z | Phase 0 baseline capture
- Task: Create baseline artifacts and checklist
- Files changed: `artifacts/phase0/*`, `ARCHITECTURE_REFACTOR_PLAN.md`
- Baseline diff summary: N/A (initial capture)
- Regression detected: No
- Notes: Baseline established for future phase comparisons.

## 2026-05-26T10:05:00Z | Phase 1 security boundary and API hardening
- Task: Harden static serving, add write-endpoint auth guard, and upload size/shape guard
- Files changed: `backend/app/api.py`, `vercel.json`, `README.md`, `ARCHITECTURE_REFACTOR_PLAN.md`
- Baseline diff summary: API read endpoints and SPA fallback still return expected status codes; write endpoints now require token only when `DASHBOARD_WRITE_TOKEN` is configured
- Regression detected: No
- Notes: Local/dev flow validated with Flask test client; traversal/static allowlist checks returned 404 as expected.
