# Phase 0 Baseline Artifacts

This folder stores baseline assets created before refactor phases.

## Contents

- `baseline_api/`
  - `api_health.json`
  - `api_sources.json`
  - `api_user_performance.json`
  - `api_debug.json`
  - `baseline_manifest.json` (status/hash/size for quick diff checks)
- `metrics_lock.json` (fields and counts that must remain stable)
- `sample_data/`
  - `sample_small_replay.csv`
  - `sample_medium_replay.csv`
- `smoke_checklist.md` (manual UI replay checklist)
- `assumptions.md` (baseline assumptions)
- `regression_policy.md` (regression logging policy)
- `regression_log.md` (initial baseline entry)

## Comparison Rule

Unless migration is explicitly approved, treat key presence, scalar values, and list counts as strict-equality checks against this baseline.
