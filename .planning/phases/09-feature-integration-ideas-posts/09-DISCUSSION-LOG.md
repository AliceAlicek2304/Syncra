# Phase 9: Feature Integration (Ideas & Posts) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-07
**Phase:** 9-Feature Integration (Ideas & Posts)
**Areas discussed:** AI Idea Persistence & Generation Flow, Post Lifecycle & Editor Persistence, Media Library & Upload Strategy, Ideas Board Customization

---

## AI Idea Persistence & Generation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Save only on explicit action | Ideas stay in memory until "Add to Board" | ✓ |
| Persistent R2 upload | Reference files are uploaded to R2 immediately | ✓ |
| Auto move → In Progress | Move idea to In Progress when creating post | ✓ |
| Light cooldown + backend limits | Manage AI usage with UI indicators and backend caps | ✓ |

## Post Lifecycle & Editor Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-save + manual actions | Debounced saving to Draft + manual Save/Schedule | ✓ |
| Parent post + platform variants | One parent record with specific overrides | ✓ |
| Scheduled stays editable | Editing scheduled posts doesn't revert to draft | ✓ |
| Reference AssetId | Posts link to assets in the library by ID | ✓ |

## Media Library & Upload Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Direct-to-R2 | Use pre-signed URLs for direct browser uploads | ✓ |
| Contextual progress only | Show progress in editor/library, no global queue | ✓ |
| Storage-level dedupe | Detect duplicates and reuse assets | ✓ |
| Flat gallery + search/filter | No folders, use robust discovery tools | ✓ |

## Ideas Board Customization

| Option | Description | Selected |
|--------|-------------|----------|
| Persisted workspace columns | Save custom column configurations per workspace | ✓ |
| Add tags + simple priority | Enrich ideas with labels and urgency | ✓ |
| No batch actions yet | Defer multi-select features | ✓ |
| Manual D&D persisted | Store exact item positions in columns | ✓ |

## the agent's Discretion

- AI Model selection.
- Auto-save debounce interval.
- Cooldown UI implementation.

## Deferred Ideas

- Batch actions for board items.
- Folder hierarchy for media library.
