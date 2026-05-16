# Phase 8 Context: Core API Integration & Auth

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Integrating the frontend with the real .NET backend. This phase covers:
- Establishing a robust API client architecture.
- Moving from mock auth to real JWT-based authentication.
- Implementing workspace (tenant) selection and persistence.
- Connecting profile and workspace settings to the backend.
</domain>

<decisions>
## Implementation Decisions

### Data Fetching & State
- **D-01:** Use **Axios** as the primary API client. It provides better interceptors for auth handling than native fetch.
- **D-02:** Introduce **TanStack Query (React Query)** for server state management. All API calls should be wrapped in hooks (e.g., `useWorkspaces`, `useProfile`).
- **D-03:** Centralize API configuration in `fe/src/utils/api.ts` (or a dedicated `lib/axios.ts`).

### Authentication
- **D-04:** Use **Bearer Tokens** in the `Authorization` header.
- **D-05:** Store the JWT in **localStorage** for persistence.
- **D-06:** Implement a `useAuth` hook that handles login/logout and provides the current user state.
- **D-07:** The `AuthContext` must be updated to use real API calls to `/api/v1/auth/login` and `/api/v1/auth/me`.

### Workspace / Multi-tenancy
- **D-08:** Create a **WorkspaceContext** to manage the active workspace.
- **D-09:** The active workspace ID should be stored in **localStorage** and sent via the `X-Workspace-Id` header in all API requests (managed by an Axios interceptor).
- **D-10:** Implement a **Workspace Selector** in the Sidebar (likely using a dropdown component).

### Forms & Validation
- **D-11:** Standardize on **React Hook Form** for all forms.
- **D-12:** Use **Zod** for schema validation.
- **D-13:** Profile and Workspace settings pages must be wired to their respective backend endpoints.

### UI/UX
- **D-14:** Implement **Loading states** using skeletons or spinners (leveraging TanStack Query's `isLoading`).
- **D-15:** Implement **Error handling** via global toast notifications or inline alerts.
</decisions>

<canonical_refs>
## Canonical References

### Backend APIs
- `be/src/Syncra.Api/Controllers/AuthController.cs`
- `be/src/Syncra.Api/Controllers/WorkspacesController.cs`
- `be/src/Syncra.Api/Controllers/UsersController.cs`

### Frontend Base
- `fe/src/context/AuthContext.tsx` (To be refactored)
- `fe/src/utils/api.ts` (To be refactored to Axios)
- `fe/src/App.tsx` (Routing & Context providers)
- `fe/src/pages/app/SettingsPage.tsx` (Profile & Workspace forms)
</canonical_refs>

<specifics>
## Specific Notes
- The backend already has `X-Workspace-Id` support in its Swagger filters, suggesting the infrastructure for multi-tenancy is ready.
- The `Syncra.Shared` project contains the base extensions for `User.GetUserId()`, ensure the JWT claims match the backend expectations.
</specifics>

<deferred>
## Deferred Ideas
- Token refresh logic (to be handled in Phase 11 if needed, or if refresh tokens are already implemented on BE).
- Role-based Access Control (RBAC) UI elements (e.g., hiding buttons for non-admins).
- HttpOnly Cookies (re-evaluated for future security hardening).
</deferred>

---

*Phase: 08-core-api-integration-auth*
*Context gathered: 2026-05-03*
