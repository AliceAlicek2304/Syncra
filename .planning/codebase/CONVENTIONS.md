# Coding Conventions

**Analysis Date:** 2026-05-25

## Naming Patterns

**Files:**
- PascalCase for React components: `PageWrapper.tsx`, `SkeletonLoader.tsx`, `AICoach.tsx`, `ProtectedRoute.tsx`
- camelCase for utilities/hooks: `shortId.ts`, `axios.ts`, `useR2Upload.ts`, `useSettings.ts`
- camelCase for API modules: `posts.ts`, `groups.ts`, `media.ts`, `ideas.ts`
- Test files mirror source: `posts.ts` → `posts.test.ts`, `PageWrapper.tsx` → `PageWrapper.test.tsx`
- CSS Modules: `PageWrapper.tsx` → `*.module.css` (co-located, same base name e.g. `PageWrapper.module.css`)

**Functions:**
- camelCase for all functions (`createPost`, `getGroups`, `toggleCoach`, `handleNext`)
- React components: PascalCase function components (`function PageWrapper()`, `export default function AICoach()`)
- Callback props: `onClose`, `onSave`, `onDelete`, `onSuccess`, `resetErrorBoundary`
- Event handlers: `handleCloseLogin`, `handleLoginSuccess`, `handleTransitionEnd`

**Variables:**
- camelCase for all variables (`workspaceId`, `postId`, `isOpen`, `prefersReduced`)
- Boolean variables prefixed with `is`, `has`, `show`: `isOpen`, `isUploading`, `hasMore`, `showNotification`

**Types:**
- PascalCase for all interfaces and type aliases: `Post`, `CreatePostRequest`, `GetPostsParams`, `PresignResponse`
- API DTOs: request/response types named `{Verb}{Entity}Request` or `{Entity}Request`/`{Entity}Response`
- Props interfaces: component name + `Props` suffix: `PageWrapperProps`, `SkeletonLoaderProps`, `ToastProps`
- Context types: `{Name}ContextType` e.g. `AuthContextType`, `ToastContextType`

**API Modules:**
- Named export object with `Api` suffix: `postsApi`, `ideasApi`, `mediaApi`, `groupsApi`, `aiApi`, `authApi`, `workspacesApi`, `notificationsApi`, `usersApi`
- Each method is an async arrow function typed with `Promise<T>`

## Code Style

**Formatting:**
- No Prettier config detected — formatting relies on ESLint only
- ESLint 9+ flat config at `fe/eslint.config.js`
- ESLint plugins: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- ESLint ignores: `['dist']`

**Linting:**
- `eslint .` runs via `npm run lint`
- Rules: `js.configs.recommended`, `tseslint.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`

**Style Inconsistencies Detected:**
- Semicolons: Source files (`.ts`, `.tsx`) consistently use semicolons; test files (`*.test.ts/tsx`) consistently omit semicolons
- Quotes: Mixed usage — most files use single quotes, some use double quotes (`utils/api.ts` uses double quotes)
- Trailing commas: Some files use them, some don't (e.g., `api/groups.ts` uses no trailing commas, `api/posts.ts` uses them)

**Lint Command:**
```bash
npm run lint          # Runs eslint . from fe/
npm run lint -- --fix # Auto-fix
```

## Import Organization

**Order:**
1. React/framework imports (`import { useState } from 'react'`)
2. Third-party library imports (`import { motion, useReducedMotion } from 'framer-motion'`, `import { Navigate } from 'react-router-dom'`)
3. Internal/local imports (`import api from '../lib/axios'`, `import { useAuth } from '../context/AuthContext'`)
4. CSS Module imports (`import styles from './PageWrapper.module.css'`)

**Path Aliases:**
- `@/` resolves to `fe/src/` (via `vitest.config.ts` and `tsconfig.app.json`)
- Example: `import { Button } from '@/components/ui/button'`

**Import Style:**
- `import type { X }` for type-only imports (`import type { ReactNode } from 'react'`, `import type { User, LoginRequest } from '../api/types'`)
- No barrel/index files detected — imports use direct file paths

## Error Handling

**Patterns:**
- **React Error Boundaries:** Via `react-error-boundary` — `WidgetErrorFallback.tsx` provides the fallback UI for widget-level errors
- **Context Hook Guards:**
  ```typescript
  // In every context hook (AuthContext.tsx, ToastContext.tsx)
  export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
  }
  ```
- **API Error Interceptor:** Global error handling in `fe/src/lib/axios.ts` — 401 redirects to login, other errors forwarded to `ToastContext`
- **try/catch with console.error:** Used in async contexts like `AuthContext.tsx` login and hydration
- **Error message parsing:** In `fe/src/utils/api.ts` — attempts to extract `.message` or `.error` from API error responses

## Logging

**Framework:** `console` (no structured logging library detected)

**Patterns:**
- `console.error('Failed to...', error)` in catch blocks (`AuthContext.tsx:27`, `AuthContext.tsx:45`)
- No `console.log` observed in source code

## Comments

**When to Comment:**
- Complex logic explanations (e.g., `useR2Upload.ts` describes the upload flow in comments)
- JSDoc-style block comments for hooks explaining purpose and flow
- Inline comments for non-obvious decisions (`// CRITICAL: Do not include Authorization...`)
- Architecture references in comments (`// D-11: Backend may return existing assetId`)

**JSDoc/TSDoc:**
- Used sparingly — only for complex hooks like `useR2Upload.ts`
- Format: `/** ... */` block comments describing purpose and flow

## Function Design

**Size:** Functions range from 1-line fetchers to ~30-line handlers. React components typically 30-100 lines.

**Parameters:**
- Named props interface for React components
- Context hooks: zero parameters
- API methods: `(workspaceId: string, data?: XxxRequest)` pattern consistently used across all API modules
- Callbacks follow `(item: Type) => void` pattern

**Return Values:**
- Async API methods: `Promise<T>` where T is response data type
- React components: `JSX.Element` (implicit)
- Boolean functions: `isAnimating`, `isOpen`, `loading`

## Module Design

**Exports:**
- **Named exports for shared utilities:** `export function PageWrapper`, `export function SkeletonLoader`, `export function useAuth`
- **Default exports for page-level components:** `export default function AICoach`, `export default function Toast`, `export default function Heatmap`
- **Named export objects for APIs:** `export const postsApi = { ... }`
- **Default export for singleton:** `export default api` (the axios instance in `lib/axios.ts`)
- Mixed pattern: `ProtectedRoute.tsx` uses default export; `PageWrapper.tsx` uses named export

**Barrel Files:** Not detected. Each component imports directly from its source file.

**CSS Modules:**
- Each visual component co-locates a `.module.css` file (39 detected in `fe/src/components/`)
- Imported as `import styles from './ComponentName.module.css'`
- Usage: `className={styles.container}`

## Data Flow Conventions

**State Management:**
- React Context for auth, workspace, toast, calendar, billing, repurpose state
- TanStack React Query for server state (observed in `fe/package.json` dependency)
- Local `useState`/`useReducer` for component-local state
- `useRef` for animation guards and imperative DOM access

**API Layer:**
- Single axios instance at `fe/src/lib/axios.ts` with interceptors for auth token and workspace ID
- API modules (`fe/src/api/*.ts`) wrap axios calls with typed request/response interfaces
- URL pattern: `workspaces/{workspaceId}/{resource}[/{id}]`

---

*Convention analysis: 2026-05-25*
