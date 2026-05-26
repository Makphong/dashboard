# CODER BRAIN (READ EVERY TASK)

Purpose: prevent repeated mistakes.  
This file must be read before making any code change.

## Non-Negotiable Rules
1. Do exactly what the user asks. Do not add extra behavior.
2. If user says "A, not B", enforce both parts explicitly.
3. Do not reinterpret wording into a different UI behavior.
4. If user repeats correction, stop and apply literal request only.
5. Do not "improve" beyond scope unless user asks.
6. Never do broad Git rollback/reset when user asks to revert only one feature area.
7. If incident is "white screen", fix immediate runtime break first before any refactor.
8. Before reporting done, scan for mojibake/encoding corruption in source files.
9. User instruction priority is absolute:
  - If user says "do until done", do not stop at explanation.
  - Complete the requested code change first, then report.
10. Mandatory brain-check every task:
  - Read this file before any edit.
  - In final response, explicitly confirm "brain-read done".

## Execution Checklist (must pass all)
- Restate request in one line before editing.
- Edit only files/areas required for that request.
- Verify outcome against exact user words.
- Verify no leftover behavior from previous interpretation.
- Run encoding safety scan:
  - `rg -n --pcre2 "[\\x{00C0}-\\x{017F}]" --glob "*.js" --glob "*.jsx" --glob "*.ts" --glob "*.tsx" --glob "*.py" --glob "*.md" --glob "*.html" --glob "*.css" .`
- Report only what was changed, no extra proposals.

## Lessons From This Incident
- "Keep button, remove page" means:
  - keep visible menu button,
  - no navigation/action behind it,
  - do not remove the button.
- "Delete page" means remove page/view behavior, not hide by redirect tricks.
- Repeated user frustration means precision first, speed second.
- Filter persistence rule:
  - Never clear selected filters while source data is temporarily empty during refresh/loading.
  - Persist only intentional user selection changes, not transient loading states.
  - Before closing task, verify refresh at least 3 times that saved filters remain intact.

## Incident Postmortem (2026-05-25)
- Command violation root cause:
  - Scope drift: attempted broader recovery paths (including Git-history exploration) while user asked to revert only filter-related logic.
  - Partial-fix loop: stopped after intermediate state and reported too early.
- Non-compliance rule:
  - Never expand scope beyond literal command when user states a narrow target.
  - Never report completion while any requested rollback residue remains.

- Mojibake miss root cause:
  - Detection pattern was too narrow and missed Thai mojibake signatures (`à¸`, `à¹`).
  - Replacement approach mixed encodings during repeated patching.
- Mojibake prevention rule:
  - Always scan with Thai-focused patterns first:
    - `rg -n "à¸|à¹|Ã|Â|â" --glob "*.js" --glob "*.jsx" --glob "*.ts" --glob "*.tsx" --glob "*.py" --glob "*.md" --glob "*.html" --glob "*.css" .`
  - Then run general extended-latin scan:
    - `rg -n --pcre2 "[\\x{00C0}-\\x{017F}]" --glob "*.js" --glob "*.jsx" --glob "*.ts" --glob "*.tsx" --glob "*.py" --glob "*.md" --glob "*.html" --glob "*.css" .`
  - If any match remains, task is not complete.

## Logic Change Log
- Date: 2026-05-25
- Topic: `IDLE_WAITING_FOR_SCHEDULED_REPROCESS` classification
- Before:
  - Treated as `Idle` in timeline lane/group and idle calculations.
  - Included in waiting stage filter bucket.
  - Counted into waiting KPIs/metrics.
- After:
  - Treated as `Reprocessing` equivalent (system lane + repeat-processing group).
  - Moved to repeat-processing stage bucket (not waiting bucket).
  - Excluded from idle waiting KPIs and counted into reprocessing-side metrics.
- Revert plan (if needed):
  - In `frontend/src/app.jsx`, remove `PROCESSING_EQUIVALENT_IDLE_SEGMENT_TYPES` usage.
  - Restore `IDLE_WAITING_FOR_SCHEDULED_REPROCESS` back to idle color/group/lane.
  - Put `IDLE_WAITING_FOR_SCHEDULED_REPROCESS` back into waiting stage filter group.
  - Revert processing metric inclusions that use `isProcessingEquivalentIdleSegment(...)`.
- Clarification update:
  - User clarified this state must align with `Reprocessing` (same group as adjacent reprocess block), not `Processing`.
  - When consecutive reprocessing-type segments are time-continuous for the same document/context, merge into one visual bar in timeline.

## Failure Pattern: Multi-Round Corrections (2026-05-25)
- Why this took multiple rounds:
  - Changed one layer at a time (logic -> label -> rendering) instead of closing all affected layers in one pass.
  - Counting/state mapping was fixed first, but user-facing text still showed waiting.
  - Text was fixed next, but timeline rendering still split a continuous reprocess flow into separate chunks.
  - Refresh persistence fix was also applied in parts, so transient empty data still cleared visible selection in some reload paths.
- Guardrail for future state-logic edits:
  - For any state reclassification, verify all 5 layers before closing task:
    1) classification/group/lane mapping
    2) labels and displayed state text
    3) tooltip/details state code shown to user
    4) KPI/system aggregations
    5) visual merge behavior for contiguous bars
  - For persisted filters, verify all 3 states before closing task:
    1) normal reload keeps previous selection
    2) temporary empty source data during reload does not clear selection
    3) "no selection" is saved only when user intentionally clears selection
  - If user says "same group/same chunk", contiguous segments in same context must be merged visually.
  - Do not close task until requested screenshot scenario is re-checked against exact wording.
  - Mandatory final validation for this class of bug: replay the exact user scenario 3 times (including refresh) before reporting done.

## Visual Logic Rule: Complete States (2026-05-25)
- `Complete` is not one visual color bucket.
- Keep bar color by original owner state:
  - Review completion uses Review color.
  - Edit completion uses Edit color.
  - System completion after reprocess round 2 uses system/reprocess color.
- Show completion event time with a green star marker on the bar (no extra box/background).
- Hover/click on the green star must show marker details (same interaction style as other markers).
- If multiple markers occur at the same timestamp, spread them with small spacing; never draw overlapping stars.
- Keep round-2 reprocess completion marker visibility even after contiguous reprocess bars are merged.

## Timeline Controls Rule (2026-05-25)
- Timeline tools must be grouped under a filter/control entry point when requested.
- Timeline filter menu supports:
  - Single lane mode
  - System lane visibility
  - Idle lane visibility
  - Star status visibility
- Export timeline action can require confirmation popup with clear confirm/cancel controls.

## Click-Outside Handler Rule (2026-05-25)
- When adding click-outside-to-close for a dropdown/popover:
  - `mousedown` fires BEFORE `click`. If you listen on `document.mousedown` to close the menu,
    it will close the menu before any `onClick` handler inside the dropdown can execute.
  - ALWAYS use a `ref` on the dropdown container and check `ref.current.contains(e.target)` 
    before closing. If the click is inside the dropdown, do NOT close.
  - Wrong pattern: `document.addEventListener('mousedown', () => setOpen(false))`
  - Correct pattern:
    ```js
    document.addEventListener('mousedown', (e) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
      setOpen(false);
    });
    ```
  - This applies to ALL interactive dropdown menus, not just timeline filters.

## Response Discipline
- If uncertain between 2 interpretations, ask one short clarification.
- Otherwise assume literal interpretation and execute directly.

## Feedback Log (2026-05-26)
- Incident: `CODE_INDEX.md` was unintentionally mojibake-corrupted during a date/update write step.
- Root cause:
  - Used a text rewrite path that changed encoding after reading content in a non-safe way.
  - Attempted `git checkout -- CODE_INDEX.md` recovery failed with `.git/index.lock` permission issue in environment.
- Prevention rule:
  - For UTF-sensitive markdown files, avoid raw rewrite commands unless strictly needed; prefer targeted `apply_patch`.
  - If full-file recovery is required, verify first 10 lines immediately after restore before any further edits.
  - When Git lock/permission errors occur, switch to read-only `git show HEAD:<file>` restoration workflow and re-validate encoding.

