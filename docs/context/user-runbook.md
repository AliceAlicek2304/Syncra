# User Runbook (No Coding Knowledge Required)

This is your exact operating procedure for multi-chat implementation.

## Definitions
- Session = one brand-new chat.
- Slice = one requirement step done in one session.
- Handoff = structured report at end of each session.

## What you do before Session 1
1. Open these docs once:
- docs/context/README.md
- docs/context/requirements-spec.md
- docs/context/slice-plan.md
2. Pick the first slice from `slice-plan.md`.
3. Copy the prompt in `session-start-prompt.md`.
4. Replace `<PASTE SLICE NAME HERE>` with your selected slice.
5. Start a fresh Claude chat and paste it.

## What you do in every new session
1. Tell Claude only one slice is allowed.
2. Ask Claude to show scope summary before coding.
3. Ask Claude to list planned file edits before changing files.
4. Let Claude implement.
5. Require completion report using `handoff-template.md`.
6. Copy that report into `session-log.md` as a new entry.
7. Move to next slice in a new chat.

## If Claude drifts from scope
Use this message:
"Stop. You are out of scope. Revert to the selected slice only, and only allowed files from docs/context/file-scope-cheatsheet.md."

## If Claude asks for file constraints and you do not know code
Use this message:
"Use docs/context/file-scope-cheatsheet.md and keep edits to the smallest listed set for this slice. If you need more, ask before editing."

## Your simple checklist per session
- One slice only
- Out-of-scope untouched
- Handoff completed
- Session log updated
- Next slice chosen

## Suggested order
1. Slice 1: Prompt + schema + parser
2. Slice 2: Wire Start Engine text flow to real generation
3. Slice 3: Dynamic tabs
4. Slice 4: Export selection mode
5. Slice 5: hardening/regression pass
