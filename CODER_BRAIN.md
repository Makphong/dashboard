# CODER BRAIN (READ EVERY TASK)

Purpose: prevent repeated mistakes.  
This file must be read before making any code change.

## Non-Negotiable Rules
1. Do exactly what the user asks. Do not add extra behavior.
2. If user says "A, not B", enforce both parts explicitly.
3. Do not reinterpret wording into a different UI behavior.
4. If user repeats correction, stop and apply literal request only.
5. Do not "improve" beyond scope unless user asks.

## Execution Checklist (must pass all)
- Restate request in one line before editing.
- Edit only files/areas required for that request.
- Verify outcome against exact user words.
- Verify no leftover behavior from previous interpretation.
- Report only what was changed, no extra proposals.

## Lessons From This Incident
- "Keep button, remove page" means:
  - keep visible menu button,
  - no navigation/action behind it,
  - do not remove the button.
- "Delete page" means remove page/view behavior, not hide by redirect tricks.
- Repeated user frustration means precision first, speed second.

## Response Discipline
- If uncertain between 2 interpretations, ask one short clarification.
- Otherwise assume literal interpretation and execute directly.

