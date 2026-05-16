---
phase: 9
slug: feature-integration-ideas-posts
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-07
---

# Phase 9 — UI Design Contract

> Visual and interaction contract for Phase 9: Feature Integration (Ideas & Posts).
> All new UI in this phase MUST conform to the existing Syncra design system documented below.
> Executors MUST read this file before touching any component or CSS file.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (Vanilla CSS Modules) |
| Preset | not applicable |
| Component library | none (custom components) |
| Icon library | `lucide-react` |
| Body font | `Inter` (weights 400, 500, 600, 700) |
| Display/title font | `Outfit` (weights 400–900) |
| Color scheme | dark-only |

---

## Design Tokens (source of truth: `fe/src/index.css`)

Executors MUST use these CSS variables. Do NOT hardcode hex values.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-dark` | `#03060c` | Page background |
| `--bg-card` | `rgba(13,17,28,0.4)` | Glass card surfaces |
| `--border-glass` | `rgba(255,255,255,0.08)` | Default card/input borders |
| `--border-glow` | `rgba(139,92,246,0.2)` | Hover/focus borders |
| `--purple-300` | `#c4b5fd` | Subtle text accents |
| `--purple-400` | `#a78bfa` | Hover states, active borders |
| `--purple-500` | `#8b5cf6` | Primary accent |
| `--purple-600` | `#7c3aed` | Pressed states |
| `--pink-500` | `#ec4899` | Gradient pair / destructive soft |
| `--cyan-400` | `#22d3ee` | Info / success accents |
| `--text-primary` | `#ffffff` | Primary text |
| `--text-secondary` | `#cbd5e1` | Secondary text |
| `--text-muted` | `#64748b` | Placeholder, metadata |
| `--gradient-brand` | `linear-gradient(135deg, #8b5cf6, #d946ef)` | Buttons, icon backgrounds |
| `--gradient-hero` | `linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #22d3ee 100%)` | Gradient text only |
| `--radius-md` | `12px` | Buttons, compact elements |
| `--radius-lg` | `20px` | Cards, modals |
| `--radius-xl` | `32px` | Large surfaces only |

### 60/30/10 Rule

| Role | Token | Share |
|------|-------|-------|
| Dominant | `--bg-dark` + `--bg-card` | 60% — backgrounds, surfaces |
| Secondary | `--border-glass` borders, `--text-secondary` | 30% — cards, text hierarchy |
| Accent | `--purple-500`, `--gradient-brand` | 10% — CTAs, active states, icon badges |

Accent (`--purple-500` / `--gradient-brand`) is reserved for: primary CTA buttons, active nav items, icon header badges, selected states, progress indicators. NOT for all interactive elements.

---

## Spacing Scale

All spacing MUST be multiples of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, badge padding |
| sm | 8px | Chip/tag padding, tight rows |
| md | 16px | Default element padding |
| lg | 24px | Section padding, card padding |
| xl | 28–32px | Page padding (IdeasPage uses 28px) |
| 2xl | 48px | Major section breaks |

Existing page padding: `28px 28px 0` (from `IdeasPage.module.css`) — maintain this for new pages.

Exceptions: none.

---

## Typography

| Role | Font | Size | Weight | Line Height |
|------|------|------|--------|-------------|
| Page title | Outfit | 22px | 800 | 1.2 |
| Section heading | Outfit | 16–18px | 700 | 1.3 |
| Body text | Inter | 14px | 400 | 1.6 |
| Label/meta | Inter | 13px | 500 | 1.4 |
| Muted/hint | Inter | 13px | 400 | 1.4 |
| Caption/badge | Inter | 12px | 700 | 1.0 |
| Display (modals) | Outfit | 18–20px | 700–800 | 1.2 |

---

## Glass Card Pattern

All cards MUST use the global `.glass-card` class (defined in `index.css`). Do NOT re-implement glassmorphism inline.

```css
/* Correct — use global class */
<div className={`glass-card ${styles.myCard}`}>

/* Wrong — never re-declare backdrop-filter inline */
<div style={{ backdropFilter: 'blur(24px)', background: 'rgba(13,17,28,0.4)' }}>
```

Hover state: `border-color: var(--border-glow); box-shadow: 0 8px 32px rgba(139,92,246,0.1)` — already handled by `.glass-card:hover`.

---

## Skeleton Loading Pattern

Use the existing `<Skeleton />` component (`fe/src/components/Skeleton.tsx`) for all loading states. Do NOT use spinners or empty divs.

```tsx
// Ideas board loading
{isLoading ? (
  Array(4).fill(0).map((_, i) => (
    <div key={i} className={styles.column}>
      <Skeleton height="200px" />
    </div>
  ))
) : ...}
```

---

## Component-Specific Contracts

### Ideas Board — No New Visual Changes

The Kanban board visual design is **frozen**. Phase 9 only wires it to the backend — no visual changes to `IdeasPage.module.css`, `IdeaCard`, or `Column`.

**Only additions allowed:**
- Skeleton loading state for groups/cards during initial fetch
- "Saving..." micro-indicator on drag-end (small text near board header, color `--text-muted`, 500ms fade)
- Error state if fetch fails: centered `.glass-card` with error message + retry button

### AI Idea Generator — Minimal UI Changes

Preserve all existing visual layout. Allowed changes only:

1. **Upload progress ring**: When a reference file is uploading to R2, show a subtle circular progress overlay on the file thumbnail. Use `stroke: var(--purple-500)`, 2px stroke, SVG.
2. **Cooldown indicator** (D-04): Replace "Generate" button text with `Wait {N}s` and set `opacity: 0.5` on the button. No spinner — just text countdown. Reset when cooldown expires.
3. **Loading state**: Keep existing orb + sparkles animation. No change.
4. **Error toast**: On generate failure, call `useToast().error(...)`. Do NOT add inline error UI inside the modal.

### Multi-platform Editor — Auto-save Status

New element: a small save status line in the editor header area.

```
Spec:
- Position: right side of editor header, next to platform badge row
- States:
    - idle: nothing shown
    - saving: gray dot + "Saving…" text (--text-muted, 12px Inter)
    - saved: green dot (#22c55e) + "Saved" text (12px Inter), fade out after 2000ms
    - error: red dot (#ef4444) + "Save failed" text
- Dot: 6px circle, inline-block, margin-right 4px
- No spinner, no modal, no toast for auto-save events
```

**No other visual changes to the editor layout.**

### Media Library Page (NEW)

New route: `/app/media`. This is a new page that must match the existing app page pattern.

**Layout spec:**
```
Page structure (matches IdeasPage pattern):
├── Header (flex, space-between)
│   ├── Left: icon badge (gradient-brand bg) + title "Media Library" (22px Outfit 800) + subtitle (13px muted)
│   └── Right: Search input + Filter chips + "Upload" button (btn-primary)
└── Gallery grid (CSS Grid, auto-fill, minmax(180px, 1fr), gap 16px)
    └── Media cards (glass-card, aspect-ratio 1/1 for images, flex for docs)
```

**Media card spec:**
```
- Container: glass-card, border-radius var(--radius-lg), overflow hidden
- Image: object-fit cover, full card size
- Overlay on hover: rgba(0,0,0,0.6) background, fade in 200ms
  - Shows: filename (13px, truncate), file size (12px muted), delete icon button
- Delete button: icon-only, --pink-500 color, 32px hit area
- Document card: show FileText icon (lucide) centered, gradient-brand background, filename below
- Selected state: border 2px solid var(--purple-500), box-shadow 0 0 0 2px rgba(139,92,246,0.3)
```

**Search input spec:**
```
- width: 220px (desktop), full-width (mobile)
- background: rgba(255,255,255,0.04)
- border: 1px solid var(--border-glass)
- border-radius: var(--radius-md) (12px)
- padding: 9px 12px 9px 36px (icon left-padded)
- Search icon: --text-muted, 16px, absolute left 10px center-v
- Focus: border-color var(--purple-400), outline none
- Font: 13px Inter
```

**Filter chips spec (type filter: All / Images / Videos / Documents):**
```
- Chip: padding 6px 14px, border-radius 20px, font-size 13px, font-weight 500
- Default: background rgba(255,255,255,0.04), border 1px solid var(--border-glass), color --text-secondary
- Active: background rgba(139,92,246,0.15), border-color var(--purple-400), color var(--purple-300)
- Transition: all 0.2s ease
```

**Empty state spec:**
```
- Centered in page, below header
- Icon: Upload (lucide), 48px, color --text-muted
- Heading: "No media yet" (18px Outfit 700, --text-secondary)
- Body: "Upload images, videos, or documents to use in your posts." (14px Inter, --text-muted)
- CTA: "Upload your first file" (btn-primary)
- No background card — just centered flex column, gap 12px
```

**Upload progress (D-10):**
```
- Contextual: within the upload zone or on the file card being uploaded
- Show: linear progress bar, height 3px, background var(--border-glass)
- Fill: var(--gradient-brand), border-radius 2px
- Percentage text: 12px Inter, --text-muted, below bar
- Do NOT use a global upload queue overlay
```

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA (Ideas) | "Generate with AI" |
| Primary CTA (Editor save) | "Save to Calendar" |
| Primary CTA (Media upload) | "Upload Files" |
| Auto-save saving state | "Saving…" |
| Auto-save saved state | "Saved" |
| Auto-save error state | "Save failed" |
| AI cooldown button | "Wait {N}s" |
| Media Library empty heading | "No media yet" |
| Media Library empty body | "Upload images, videos, or documents to use in your posts." |
| Board loading skeleton label | (no text — skeleton only) |
| Drag-end saving indicator | "Saving order…" (fades after 800ms) |
| Delete idea confirmation | "Delete idea: This cannot be undone." |
| Delete media confirmation | "Delete file: It will be removed from all posts that reference it." |
| Error toast (generic) | "Something went wrong. Please try again." |
| Error toast (AI generate) | "Failed to generate ideas. Please try again." |
| Error toast (upload) | "Upload failed. Check your connection and try again." |

Language note: UI copy should be English. Existing Vietnamese strings in the codebase (e.g. "Đã chọn", "Thêm vào board") should be replaced with English equivalents in Phase 9.

---

## Interaction & Animation Contracts

| Interaction | Spec |
|-------------|------|
| Button hover | `translateY(-2px)` + glow shadow — already in `.btn-primary:hover` |
| Card hover | `border-color: var(--border-glow)` — already in `.glass-card:hover` |
| Chip/filter toggle | `background` + `border-color` transition, 200ms ease |
| Modal open | fade-in: `opacity 0→1`, `scale 0.97→1`, 220ms ease — match existing modal pattern |
| Modal close | reverse: `opacity 1→0`, `scale 1→0.97`, 180ms |
| Skeleton pulse | `opacity 0.5→1` alternating, 1.5s ease-in-out infinite — use existing `<Skeleton>` |
| Drag card | `opacity: 0.4` on source card — already in `IdeaCard` |
| Media card hover overlay | `opacity 0→1`, 200ms ease |
| Save status fade | After "Saved" shows, fade out after 2000ms: `opacity 1→0`, 400ms ease |
| Upload progress bar | Width transition: `width`, 200ms ease for each progress tick |

No Framer Motion in Phase 9 (deferred to Phase 11). Use CSS transitions only.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none (Vanilla CSS) | — | not required |
| `lucide-react` | Upload, FileText, Image, Trash2, Check, Search, X | not required (already in project) |
| `@tanstack/react-query` | useQuery, useMutation | not required (already in project) |
| `@dnd-kit/*` | (existing, no new blocks) | not required |

No new npm packages should be added in Phase 9 without explicit approval.

---

## New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `fe/src/pages/app/MediaLibraryPage.tsx` | React page | Media Library UI |
| `fe/src/pages/app/MediaLibraryPage.module.css` | CSS Module | Media Library styles |
| `fe/src/api/ideas.ts` | API module | Ideas/posts CRUD |
| `fe/src/api/groups.ts` | API module | Groups CRUD |
| `fe/src/api/media.ts` | API module | Media upload + library |
| `fe/src/api/ai.ts` | API module | AI generation |
| `fe/src/hooks/useR2Upload.ts` | Custom hook | Presign → PUT → confirm flow |
| `fe/src/hooks/useDebouncedMutation.ts` | Custom hook | Debounced auto-save |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — all states and confirmations specified in English
- [x] Dimension 2 Visuals: PASS — glass-card pattern, skeleton, icon badges consistent with existing pages
- [x] Dimension 3 Color: PASS — 60/30/10 rule enforced, accent usage explicitly listed
- [x] Dimension 4 Typography: PASS — Inter/Outfit role table defined, sizes match existing pages
- [x] Dimension 5 Spacing: PASS — 4px grid enforced, 28px page padding consistent with IdeasPage
- [x] Dimension 6 Registry Safety: PASS — no new packages; all blocks from existing dependencies

**Approval:** approved 2026-05-07
