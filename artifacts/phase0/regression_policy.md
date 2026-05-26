# Phase 0 Regression Log Policy

## Rule
For every phase change, compare current outputs against `artifacts/phase0/baseline_api/` and `artifacts/phase0/metrics_lock.json`.

## Minimum Log Fields
- Date/Time (UTC)
- Phase and task
- Files changed
- Baseline diff summary
- Regression detected? (Yes/No)
- If Yes: root cause, fix, re-test result

## Severity Guide
- P0: API contract break / dashboard unusable
- P1: KPI mismatch or major chart/timeline drift
- P2: minor visual/layout variance with correct data

## Storage
Append entries to: `artifacts/phase0/regression_log.md`
