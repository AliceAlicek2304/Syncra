# Agent Instructions

Add project-specific agent instructions here.

<!-- HARNESS:BEGIN -->
## Harness

This repo uses Harness. Before work, read:

- `README.md`
- `docs/HARNESS.md`
- `docs/FEATURE_INTAKE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTEXT_RULES.md`
- `scripts/bin/harness-cli query matrix` on macOS/Linux, or `.\scripts\bin\harness-cli.exe query matrix` on Windows

Use the Rust Harness CLI at `scripts/bin/harness-cli` on macOS/Linux or
`scripts/bin/harness-cli.exe` on Windows as the main operational tool.
<!-- HARNESS:END -->

<!-- AGENT_SKILLS:BEGIN -->
## Agent Skills (addyosmani/agent-skills)

agent-skills provides 24 production-grade engineering workflows. This project uses
the OpenCode integration pattern: skills auto-discover via the `skill` tool.

### Core Rules

- If a task matches a skill (even 1% chance), you MUST invoke it
- Skills live in `skills/<name>/SKILL.md` and are loaded via `skill` tool
- Never implement directly if a skill applies
- Always follow skill instructions exactly — no partial application

### Intent → Skill Mapping

| Intent | Skill(s) |
|--------|----------|
| Feature / new functionality | `spec-driven-development`, `incremental-implementation`, `test-driven-development` |
| Planning / breakdown | `planning-and-task-breakdown` |
| Bug / failure | `debugging-and-error-recovery` |
| Code review | `code-review-and-quality` |
| Refactoring / simplification | `code-simplification` |
| API / interface design | `api-and-interface-design` |
| UI work | `frontend-ui-engineering` |

### Lifecycle Mapping

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior: always check for and use skills first.
<!-- AGENT_SKILLS:END -->
