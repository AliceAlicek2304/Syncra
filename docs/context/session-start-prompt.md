You must do these steps in order:
1. Read these files first:
- docs/context/claude/README.md
- docs/context/claude/requirements-spec.md
- docs/context/claude/restrictions.md
- docs/context/claude/plan.md
- docs/context/claude/file-scope-cheatsheet.md
- docs/context/claude/session-log.md
1. Summarize scope, non-scope, and selected slice before coding.
2. Implement slice 1 in plan.md
3. Edit only files in the allowed scope for this slice.
4. If you need files outside the scope, stop and ask for approval.
5. Run checks after coding:
- frontend typecheck/build/lint as available
- targeted manual smoke steps for this slice
1. Return completion report using docs/context/handoff-template.md format.

Additional non-negotiable rules:
- Work only on `Dan Van Ban` flow.
- Do not implement `Tu URL` or `Tai file len`.
- No mock fallback in real generation path.
- AI output must be strict JSON matching `RepurposeAtom` in `TechNest\fe\src\data\mockAI.ts`.