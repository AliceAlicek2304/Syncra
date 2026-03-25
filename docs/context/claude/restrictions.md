# Claude Restrictions and Safety Guardrails

## Mandatory process
1. Read all files listed before coding.
2. Restate in-scope and out-of-scope before any edit.
3. Implement exactly one slice per chat.
4. Edit only files allowed by the selected slice.
5. Run required checks before finishing.
6. Produce handoff output using `handoff-template.md`.

## Hard restrictions
- Do not implement `Tu URL` or `Tai file len` behavior.
- Do not keep or add silent fallback to mock generation in real flow.
- Do not invent API endpoints; first find existing API client pattern.
- Do not change unrelated pages/components.
- Do not change shared types without documenting impact.
- Do not bypass JSON validation.
- Do not return markdown-wrapped JSON from AI path.

## Quality rules
- Prefer strict typing over `any`.
- Handle invalid JSON with clear UI error state.
- Keep loading and error state deterministic.
- Avoid hidden side effects in UI handlers.
- Preserve current UX language unless requirement says otherwise.
- All error message must not be generic

## Evidence rules for every completion
Must include:
- exact files changed
- what changed and why
- command outputs for checks
- known risks and follow-up
