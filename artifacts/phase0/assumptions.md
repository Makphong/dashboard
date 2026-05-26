# Phase 0 Assumptions

- Baseline is captured from the current local SQLite dataset (`local_dashboard.db`) at capture time.
- Equality checks for regression should be strict for key presence, scalar values, and list lengths unless migration is explicitly documented.
- UI behavior verification remains manual-first in this phase; automated browser checks can be added in a later phase.
- Sample replay CSV files are synthetic and intended for deterministic smoke/regression validation, not business data fidelity.
