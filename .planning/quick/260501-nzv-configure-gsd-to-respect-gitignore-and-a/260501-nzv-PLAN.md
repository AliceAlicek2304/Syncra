---
quick_id: 260501-nzv
slug: configure-gsd-to-respect-gitignore-and-a
description: Configure GSD to respect .gitignore by removing the .planning directory from ignore rules.
---

## Tasks

### 1. Update .gitignore
Remove `**/.planning/` from the root .gitignore to allow GSD state to be tracked normally without force-adding.
**Files:** .gitignore
**Action:** edit
**Verify:** `git check-ignore be/.planning/STATE.md` should return no output.
**Done:** .gitignore updated.

### 2. Verify git status
Ensure no other sensitive files are being force-added and that subsequent commits work without -f.
**Files:** .planning/STATE.md
**Action:** test
**Verify:** `git add .planning/STATE.md` works without error.
**Done:** Verification complete.
