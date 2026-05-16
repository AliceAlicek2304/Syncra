# Phase 9: Research — Feature Integration (Ideas & Posts)

**Phase:** 9 — Feature Integration (Ideas & Posts)
**Researched:** 2026-05-07
**Status:** Complete

---

## Executive Summary

Phase 9 transitions IdeasPage, AIIdeaGenerator, and MultiPlatformEditor from fully local-state / mock-data implementations to real backend persistence. The backend API already exposes all required endpoints (Groups, Posts, Media) under the `/api/v1/workspaces/{workspaceId}/...` pattern established in Phase 8. The frontend already has a proven pattern: Axios client (`fe/src/lib/axios.ts`) with JWT + workspace-ID interceptors, `@tanstack/react-query` for data fetching (see WorkspaceContext, DashboardPage), and a ToastContext for notifications.

The three integration surfaces are:
1. **Ideas Board** — Replace in-memory `useState` groups + ideas with `useQuery`/`useMutation` calls against the Groups and Posts endpoints. Wire `handleDragEnd` to a position-update mutation.
2. **AI Idea Generator** — Replace the `getMockResults()` + `setTimeout` fake with a real `POST /api/v1/workspaces/{workspaceId}/ai/ideas/generate` mutation. Files selected as references are uploaded to R2 first (via presign → PUT flow) and their assetIds are sent in the generation request.
3. **Multi-platform Editor (Posts)** — Replace the fake `setTimeout` save with debounced auto-save (`useMutation`) to `POST/PUT /posts`. Support platform variants via the parent-post + platform-content model. Wire schedule date/time to a scheduled-at UTC field.

The backend does NOT yet expose AI generation or presigned upload endpoints — these must be built or stubbed as part of this phase.

---

## 1. Codebase Audit

### 1.1 IdeasPage (`fe/src/pages/app/IdeasPage.tsx`)

| Current State | Required Change |
|---|---|
| `useState<Group[]>(DEFAULT_GROUPS)` hardcoded | Replace with `useQuery(['groups', workspaceId], () => groupsApi.getGroups(workspaceId))` |
| `useState<Idea[]>([])` — ideas never persisted | Replace with `useQuery(['ideas', workspaceId], () => postsApi.getPosts(workspaceId, { type: 'idea' }))` |
| `addIdea()` → local state push | Replace with `useMutation` → `postsApi.createPost()` + `queryClient.invalidateQueries(['ideas'])` |
| `saveIdea()` → local state update | Replace with `useMutation` → `postsApi.updatePost()` |
| `deleteIdea()` → local filter | Replace with `useMutation` → `postsApi.deletePost()` |
| `moveIdea()` → local status update | Replace with `useMutation` → `postsApi.updatePost({ groupId })` |
| `handleDragEnd()` — no-op comment | Add `useMutation` → `postsApi.reorderPost()` or `updatePost` with new position |
| `renameGroup()` → local update | Replace with `useMutation` → `groupsApi.updateGroup()` |
| `deleteGroup()` → local filter | Replace with `useMutation` → `groupsApi.deleteGroup()` |
| `addGroup()` → local push | Replace with `useMutation` → `groupsApi.createGroup()` |
| `handleSelectAIIdea()` → local push | After AI generation, call `postsApi.createPost()` if user clicks "Add to Board" (D-01) |

**Key architectural note:** The backend uses the same `Post` entity for both "ideas" and "posts". Ideas are distinguished by having `status: 'idea'` (or equivalent `groupId` pointing to an Idea-type group). Frontend query filters should use `?type=idea` or `?status=idea`.

### 1.2 AIIdeaGenerator (`fe/src/components/AIIdeaGenerator.tsx`)

| Current State | Required Change |
|---|---|
| `getMockResults(input)` + 1600ms `setTimeout` | Replace with real `useMutation` to `POST /ai/ideas/generate` |
| `uploadedFiles` → `ObjectURL` only, never sent | Upload to R2 immediately (D-02): presign → PUT → get assetId. Pass `assetIds[]` in generate request |
| `handleBulkAdd()` → calls parent callback | Callback still fires, but upstream `handleSelectAIIdea` now calls `postsApi.createPost()` |
| No cooldown / rate limit UI | Add cooldown state after generate response (D-04); track `cooldownUntil` from API response header |

**AI generation request shape (proposed):**
```typescript
interface AIGenerateRequest {
  topic: string;
  niche?: string;
  audience?: string;
  goal?: string;
  tone?: string;
  referenceAssetIds?: string[]; // R2 assetIds uploaded before call
}

interface AIGenerateResponse {
  ideas: {
    id: string;
    title: string;
    hook: string;
    caption: string;
    type: string;
    platforms: string[];
  }[];
  cooldownSeconds?: number; // for rate limiting (D-04)
}
```

### 1.3 MultiPlatformEditor (`fe/src/components/MultiPlatformEditor.tsx`)

| Current State | Required Change |
|---|---|
| `onSave(contents)` → fake `setTimeout(1000)` | Replace with real `useMutation` to `PUT /posts/{postId}` |
| No auto-save | Add debounced auto-save (1.5s) triggering on caption/hashtag changes (D-05) |
| `scheduledDate`/`scheduledTime` → never persisted | Map to `scheduledAtUtc: string` ISO field in POST/PUT payload |
| No `postId` prop — editor has no concept of a record | Must accept `postId?: string` prop; create Draft on mount if null, update on changes |
| No platform variants | Store per-platform caption as `platformContents: { platform: string, caption: string, hashtags: string[] }[]` |
| No media attachment | Add media picker wired to Media Library endpoint |

---

## 2. Backend API Contract

### 2.1 Existing Endpoints (from `be/API_DOCS.md`)

All confirmed available under `base: /api/v1/workspaces/{workspaceId}`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/groups` | List workspace groups (board columns) |
| POST | `/groups` | Create group |
| PUT | `/groups/{groupId}` | Rename group |
| DELETE | `/groups/{groupId}` | Delete group |
| GET | `/posts` | List posts (`?status=draft&page=1&pageSize=50`) |
| POST | `/posts` | Create post/idea |
| GET | `/posts/{postId}` | Get single post |
| PUT | `/posts/{postId}` | Update post |
| DELETE | `/posts/{postId}` | Delete post |
| POST | `/posts/{postId}/publish` | Publish post |
| POST | `/media/upload` | Upload media (multipart) |
| GET | `/media` | List media library |
| DELETE | `/media/{mediaId}` | Delete media |

### 2.2 Missing Endpoints (need to be built or stubbed)

| Method | Path | Purpose | Priority |
|---|---|---|---|
| POST | `/ai/ideas/generate` | AI idea generation | HIGH (D-01, D-02, D-04) |
| POST | `/media/presign` | Get pre-signed R2 PUT URL | HIGH (D-02, D-09) |
| PUT | `/posts/{postId}/reorder` | Persist dnd-kit position | MEDIUM (D-15) |

### 2.3 Post Create/Update Request Shape (proposed)

```typescript
// POST /workspaces/{workspaceId}/posts
interface CreatePostRequest {
  title: string;
  groupId?: string;             // which board column
  status: 'idea' | 'draft' | 'scheduled' | 'published';
  content?: string;             // master caption
  scheduledAtUtc?: string;      // ISO 8601
  platforms?: string[];         // ['TikTok', 'Instagram']
  platformContents?: {
    platform: string;
    caption: string;
    hashtags?: string[];
  }[];
  mediaAssetIds?: string[];     // refs to Media Library (D-08)
  priority?: 'low' | 'medium' | 'high';  // D-14
  tags?: string[];              // D-14
  position?: number;            // D-15 drag-drop ordering
}
```

### 2.4 Position / Reorder

Decision D-15 requires position persistence. Two approaches:

**Option A (simple integer):** Each post stores `position: number` within its group. On drag-end, send PATCH/PUT with `{ position: newIndex }`. Backend resequences.

**Option B (fractional/LexoRank):** Use `position: string` lexicographic ordering (e.g. `"a0"`, `"a1"`) — avoids full resequencing. More complex to implement.

**Recommendation:** Option A for Phase 9 (simpler). Backend resequences on conflict. The `handleDragEnd` in IdeasPage already has the reordered `ideas` array — send the full ordered list of IDs in one PATCH call.

---

## 3. Cloudflare R2 Upload Strategy

Decision D-09 mandates direct-to-R2 via pre-signed URLs.

### 3.1 Flow

```
1. User selects file in AIIdeaGenerator or Media Library
2. Frontend POST /media/presign { filename, contentType, sizeBytes }
3. Backend (using AWS SDK S3 compatible client) generates presigned PUT URL with 5min TTL
4. Backend creates a pending MediaAsset record, returns { presignedUrl, assetId, publicUrl }
5. Frontend does PUT {presignedUrl} with file blob directly (no backend proxy)
6. Frontend POST /media/upload/confirm { assetId } to finalize the record
   OR backend uses S3 event notification (simpler: just confirm endpoint)
7. Frontend stores assetId for use in post/idea records
```

### 3.2 Upload Progress (D-10)

Use Axios `onUploadProgress` for contextual progress within the editor modal:

```typescript
await axios.put(presignedUrl, file, {
  headers: { 'Content-Type': file.type },
  onUploadProgress: (event) => {
    const percent = Math.round((event.loaded * 100) / (event.total ?? 1));
    setUploadProgress(prev => ({ ...prev, [fileId]: percent }));
  }
});
```

Do NOT use the `api` Axios instance (with auth headers) for the presigned URL — R2 rejects extra auth headers. Use a plain `axios.put()` call.

### 3.3 Deduplication (D-11)

Backend calculates MD5/SHA256 of the file content. If a hash match exists in the workspace's media assets, return the existing `assetId` instead of creating a new one. Frontend is unaware of deduplication — it always calls presign and gets back an assetId.

### 3.4 Media Library UI (D-12)

New page/route: `/app/media`. Features:
- Grid gallery of all workspace media assets
- Search by filename
- Filter by type (image, video, document)
- Delete action
- "Insert" action (to use asset in post editor)

Use `useQuery(['media', workspaceId], mediaApi.getMedia)` with search/filter params.

---

## 4. AI Idea Generation Flow

### 4.1 Backend Flow (to be built)

```
Frontend POST /ai/ideas/generate { topic, tone, goal, niche, audience, referenceAssetIds[] }
→ Backend retrieves reference file URLs from MediaAsset records
→ Backend calls OpenAI / configured LLM provider with prompt
→ Backend returns structured JSON: { ideas: [...], cooldownSeconds: 30 }
```

### 4.2 Frontend State Machine

The existing 3-step state machine (`form` → `loading` → `results`) works well. Replace the fake `setTimeout` call with:

```typescript
const generateMutation = useMutation({
  mutationFn: (input: AIGenerateRequest) => aiApi.generateIdeas(workspaceId, input),
  onSuccess: (data) => {
    setResults(data.ideas);
    setCooldownUntil(Date.now() + (data.cooldownSeconds ?? 0) * 1000);
    setStep('results');
  },
  onError: () => {
    setStep('form');
    toast.error('Failed to generate ideas. Please try again.');
  }
});
```

### 4.3 Reference File Upload (before generation)

Per D-02, files are uploaded to Media Library first:

```typescript
const handleGenerate = async () => {
  setStep('loading');
  
  // 1. Upload reference files to R2 if any
  const assetIds = await Promise.all(
    uploadedFiles.map(f => uploadToR2(f.file, workspaceId))
  );
  
  // 2. Generate ideas with assetIds
  generateMutation.mutate({ topic, tone, goal, niche, audience, referenceAssetIds: assetIds });
};
```

### 4.4 Cooldown Indicator (D-04)

Light visual indicator — a disabled "Generate" button with countdown text:
```tsx
const isCoolingDown = cooldownUntil > Date.now();
// disabled={!topic.trim() || isCoolingDown || generateMutation.isPending}
// button text: isCoolingDown ? `Wait ${remainingSeconds}s` : 'Generate'
```

---

## 5. Debounced Auto-save Pattern

Decision D-05 requires debounced auto-save in MultiPlatformEditor.

### 5.1 Implementation Pattern

```typescript
import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// In MultiPlatformEditor:
const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

const autoSave = useCallback((updated: PostUpdateRequest) => {
  setSaveStatus('saving');
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(async () => {
    try {
      await updatePostMutation.mutateAsync(updated);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, 1500);
}, [updatePostMutation]);

// Trigger on every caption change:
const handleCaptionChange = (platform: string, newCaption: string) => {
  setContents(prev => ({ ...prev, [platform]: { ...prev[platform], caption: newCaption } }));
  autoSave({ id: postId!, platformContents: updatedContents });
};

// Cleanup on unmount:
useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
```

### 5.2 Status Indicator

Small indicator in editor header:
```
[Saving…]  →  [✓ Saved]  →  (fades after 2s)
```

### 5.3 "Create Draft on Mount" Pattern (D-07)

If `postId` is null when the editor opens, create a Draft record immediately:

```typescript
useEffect(() => {
  if (!postId) {
    createPostMutation.mutate({ status: 'draft', title: 'Untitled', workspaceId }, {
      onSuccess: (post) => setPostId(post.id)
    });
  }
}, []);
```

This ensures auto-saves always have a target record, and the user never needs to "save" to create — the Draft exists from the moment they open the editor.

---

## 6. Drag-and-Drop Position Persistence

### 6.1 Current dnd-kit Implementation

`handleDragOver` already performs optimistic reordering of the `ideas` array in local state. `handleDragEnd` currently does nothing backend-side (see comment on line 418).

### 6.2 Required Change

In `handleDragEnd`, after confirming the drag was completed (not cancelled), call the reorder mutation:

```typescript
const reorderMutation = useMutation({
  mutationFn: ({ workspaceId, orderedIds }: { workspaceId: string, orderedIds: string[] }) =>
    postsApi.reorderPosts(workspaceId, orderedIds),
  onError: () => {
    // Rollback: re-fetch from server
    queryClient.invalidateQueries(['ideas', workspaceId]);
    toast.error('Reorder failed, refreshing...');
  }
});

const handleDragEnd = () => {
  setActiveId(null);
  // `ideas` already has optimistic order from handleDragOver
  reorderMutation.mutate({
    workspaceId: activeWorkspace.id,
    orderedIds: ideas.map(i => i.id)
  });
};
```

**Optimistic update approach:** Local state is updated by `handleDragOver` during drag (existing code). On `handleDragEnd`, we persist the current order. On error, invalidate + refetch to restore server truth.

### 6.3 Position API Contract (proposed)

```
PUT /workspaces/{workspaceId}/posts/reorder
Body: { orderedIds: string[] }
```

Backend assigns position values (0, 1, 2...) in the given order within each group.

---

## 7. Implementation Risks & Gotchas

| Risk | Impact | Mitigation |
|---|---|---|
| AI endpoint not yet built | Blocks `AIIdeaGenerator` integration | Build stub endpoint returning hardcoded JSON first; swap real LLM after |
| Presign endpoint not yet built | Blocks R2 upload flow | Build presign + confirm endpoints as first backend tasks |
| `Post` model may not have `groupId` or `position` fields | Breaks Ideas board | Check EF Core migration; add fields if missing |
| MultiPlatformEditor has no `postId` prop | Auto-save has no target | Must refactor parent (`CreatePostModal` or `CalendarPage`) to pass `postId` |
| Direct R2 PUT rejects auth headers | Upload silently fails | Use plain `axios.put()` (not the `api` instance) for presigned URL PUT |
| Cooldown state lost on component remount | User can spam AI | Track cooldown in a React Context or localStorage instead of local state |
| `getMockResults` import in AIIdeaGenerator | Must remove mock dependency | Remove `../data/mockAI` import and all references |
| Hashtag add button in MultiPlatformEditor is not implemented | Post has incomplete hashtag UX | Implement hashtag add/remove before wiring to backend |
| Backend `workspaceId` must match `X-Workspace-Id` header | 403 errors if mismatch | Always read `activeWorkspace.id` from WorkspaceContext; never hardcode |
| `shortId()` generates frontend-only IDs for ideas | Will conflict with server-generated UUIDs | After createPost succeeds, update local state `id` with the server-returned UUID |

---

## 8. Validation Architecture

### 8.1 Unit / Integration Tests

| Scenario | Type | Tool |
|---|---|---|
| `postsApi.createPost()` serializes correct shape | Unit | Vitest + msw |
| `postsApi.updatePost()` sends `X-Workspace-Id` header | Unit | Vitest + msw |
| Upload flow: presign → PUT → confirm completes successfully | Integration | Vitest + msw |
| Auto-save debounce: only 1 mutation fires after 3 rapid keystrokes | Unit | Vitest + fake timers |
| Drag-end calls reorder mutation with correct ordered IDs | Unit | Vitest |
| AI generate button disabled during cooldown period | Unit | Vitest + React Testing Library |

### 8.2 E2E Tests (Playwright)

| Flow | Verification |
|---|---|
| Create idea → verify persists on page reload | `page.reload()` → idea still visible in board |
| Generate AI ideas → Add to Board → verify in DB | Idea card appears; API call confirmed via `waitForResponse` |
| Upload reference file → verify assetId in generate request | Intercept `POST /ai/ideas/generate`; assert `referenceAssetIds.length > 0` |
| Type in editor → stop → wait 1.5s → verify "Saved" indicator | `page.waitForSelector('[data-testid="save-status-saved"]')` |
| Schedule post → verify `scheduledAtUtc` in backend response | Intercept `PUT /posts/{id}`; assert `scheduledAtUtc` is ISO string |
| Drag idea between columns → verify status update API call | `waitForResponse(/posts\/.*/, r => r.json().groupId === targetGroupId)` |
| Upload image to Media Library → verify appears in gallery | Navigate to `/app/media`; image thumbnail visible |

### 8.3 Manual UAT Checklist

- [ ] AI generator shows real results (not mock data)
- [ ] Ideas persist after page refresh
- [ ] Board columns match workspace groups in DB
- [ ] Drag-and-drop order persists after reload
- [ ] Auto-save shows "Saved" within 2s of stopping typing
- [ ] Scheduled post has correct UTC time in backend
- [ ] Reference files appear in Media Library after generator use
- [ ] Media deduplication: uploading same file twice uses one asset
- [ ] AI cooldown indicator shows and disables button correctly
- [ ] Error states (network failure) show toast and don't corrupt UI

---

## RESEARCH COMPLETE
