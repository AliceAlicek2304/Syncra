# Phase 9: Feature Integration (Ideas & Posts) - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Connecting the AI Idea Generator and Multi-platform Editor to real backend endpoints, enabling persistent storage for ideas/posts, and integrating media asset management (Cloudflare R2).

</domain>

<decisions>
## Implementation Decisions

### AI Idea Persistence & Generation Flow
- **D-01:** AI-generated ideas are stayed in memory until the user explicitly chooses to "Add to Board" or "Create Post". Only then are they saved to the database.
- **D-02:** Reference files (images/PDFs) in the generator are uploaded to the Media Library (R2) immediately upon selection in the modal, allowing them to be reused and persisted.
- **D-03:** When an idea is turned into a post, the Idea record is automatically moved to the "In Progress" column on the board.
- **D-04:** AI usage is managed via backend limits, with a light cooldown indicator in the UI to prevent spam.

### Post Lifecycle & Editor Persistence
- **D-05:** The editor supports debounced auto-saving to "Draft" status as the user types, in addition to explicit manual "Save" or "Schedule" actions.
- **D-06:** Multi-platform posts are stored using a "Parent Post" record with associated "Platform Variants" (storing overrides like platform-specific text/media).
- **D-07:** Scheduled posts remain editable until the time of posting without reverting to draft status unless explicitly un-scheduled.
- **D-08:** Posts reference media assets by their `AssetId` from the Media Library rather than copying URLs.

### Media Library & Upload Strategy
- **D-09:** Implemented a direct-to-R2 upload strategy using pre-signed URLs obtained from the backend for optimal performance.
- **D-10:** Upload progress is shown contextually within the Post Editor or Media Library page rather than a global queue.
- **D-11:** Storage-level deduplication using MD5/SHA hashes is performed on the backend to reuse existing assets and save storage.
- **D-12:** The Media Library features a flat gallery with robust search and filtering capabilities (no folder hierarchy in this phase).

### Ideas Board Customization
- **D-13:** Board groups (columns) are persisted in the backend and are customizable per workspace.
- **D-14:** Idea records support tags and a simple priority level (e.g., Low, Medium, High).
- **D-15:** Manual drag-and-drop ordering is persisted in the database via a position field.

### the agent's Discretion
- Selection of specific AI models for idea generation (GPT-4o or similar).
- Exact implementation of the debounced auto-save logic.
- UI details for the "Light cooldown" indicator.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Core
- `.planning/PROJECT.md` — Project vision and tech stack.
- `.planning/REQUIREMENTS.md` — REQ-8.4, REQ-8.5, REQ-8.6 define this phase's goals.

### Backend APIs
- `be/src/Syncra.API/Controllers/WorkspacesController.cs` — Reference for workspace context.
- `be/src/Syncra.Application/Interfaces/IPaymentProvider.cs` — (Reference for established patterns).

### Frontend Assets
- `fe/src/pages/app/IdeasPage.tsx` — Current local-state implementation of the ideas board.
- `fe/src/components/AIIdeaGenerator.tsx` — Current local-state implementation of the AI generator.
- `fe/src/components/MultiPlatformEditor.tsx` — Current implementation of the editor.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AIIdeaGenerator`: Can be refactored to use a `useMutation` for generation and persistence.
- `MultiPlatformEditor`: Needs to be connected to `useMutation` for auto-saving.
- `dnd-kit` implementation in `IdeasPage`: Needs to be updated to send position updates to the backend.

### Established Patterns
- **Axios Interceptors**: Use for handling auth and tenant-id headers in all new API calls.
- **ToastContext**: Use for all upload/save/error notifications.
- **Glassmorphism Skeletons**: Use for loading board groups and ideas.

### Integration Points
- `IdeasPage` connectivity to new `ideasApi`.
- `MultiPlatformEditor` connectivity to `postsApi`.
- `AIIdeaGenerator` connectivity to `aiApi`.

</code_context>

<specifics>
## Specific Ideas
- "Auto move → In Progress" when an idea is selected for a post.
- "Storage-level dedupe" to prevent redundant uploads.
- "Manual D&D persisted" for board columns.

</specifics>

<deferred>
## Deferred Ideas
- **Batch Actions**: Multi-select for deleting/moving ideas deferred to a future phase.
- **Media Folders**: Hierarchy in media library deferred in favor of flat gallery + search.

</deferred>

---

*Phase: 9-Feature Integration (Ideas & Posts)*
*Context gathered: 2026-05-07*
