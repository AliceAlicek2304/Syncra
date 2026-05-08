---
quick_id: 260501-nzv
slug: configure-gsd-to-respect-gitignore-and-a
description: Updated .gitignore to remove .planning exclusion.
completed: 2026-05-01
---

## Accomplishments
- Removed `**/.planning/` from root .gitignore.
- Verified that GSD state files are no longer ignored and can be committed normally.

## Decisions Made
- Adhered to user instruction to respect .gitignore by making the .planning directory explicit (unignored) instead of force-adding it.
