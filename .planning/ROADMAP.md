# Roadmap: v1.5 Google Auth & Account Linking

**Milestone:** v1.5 Google Auth & Calendar Integration (Calendar removed by user)
**Created:** 2026-05-16
**Last Updated:** 2026-05-16
**Granularity:** Standard
**Coverage:** 11/11 requirements mapped

## Phases

- [x] **Phase 15: Multi-Provider Auth Foundation + Google OAuth** - IAuthProvider abstraction, Google OAuth login/signup, profile import ✅
- [x] **Phase 16: Account Linking & Management** - Collision detection, password verification, linked accounts management ✅
    - [x] Collision detection & `linking_required` status
    - [x] Secure password-verified linking flow
    - [x] Settings UI for viewing/unlinking accounts
- [x] **Phase 17: Token Storage + Auto-Refresh + Revocation** - PostgreSQL + Redis token storage, auto-refresh, graceful revocation handling ✅

## Phase Details

### Phase 15: Multi-Provider Auth Foundation + Google OAuth
**Goal**: Users can authenticate with Google accounts through a multi-provider-ready architecture
**Depends on**: Phase 14 (v1.4 code quality baseline)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User can click "Sign in with Google" on login page and be redirected to Google consent, then returned to the app with a valid JWT session
  2. First-time Google user gets a new account auto-created with name, email, and avatar imported from Google profile
  3. Returning Google user is signed in to their existing account without creating a duplicate
  4. IAuthProvider interface exists and can be implemented to add a future provider (GitHub, Microsoft, Apple) without modifying auth flow logic
**Plans**: 4 plans
Plans:
- [ ] 15-01-PLAN.md — IAuthProvider interface + ExternalLogin entity
- [ ] 15-02-PLAN.md — GoogleAuthProvider implementation + DI registration
- [ ] 15-03-PLAN.md — OAuth login/callback endpoints + user creation logic
- [ ] 15-04-PLAN.md — Google button in LoginModal + OAuth callback page
**UI hint**: yes

### Phase 16: Account Linking
**Goal**: Users can safely link their Google account to an existing email/password account
**Depends on**: Phase 15
**Requirements**: LINK-01, LINK-02, LINK-03, LINK-04
**Success Criteria** (what must be TRUE):
  1. When a Google email matches an existing email/password account, the system detects the collision and prompts the user to verify ownership with their password before linking
  2. After password verification, the Google account is linked to the existing account (no duplicate created)
  3. User can view all linked authentication methods (email/password, Google) in account settings
  4. User can unlink their Google account from settings, and the account remains accessible via email/password
**Plans**: 3 plans
- [x] 16-01-PLAN.md — Backend collision detection & link endpoint ✅
- [x] 16-02-PLAN.md — Frontend password verification modal ✅
- [x] 16-03-PLAN.md — Settings UI for linked accounts & unlinking ✅
**UI hint**: yes

### Phase 17: Token Storage + Auto-Refresh + Revocation
**Goal**: Google OAuth tokens are durably stored, automatically refreshed, and revocation is handled gracefully
**Depends on**: Phase 15
**Requirements**: TOKEN-01, TOKEN-02, TOKEN-03
**Success Criteria** (what must be TRUE):
  1. Google OAuth access and refresh tokens are persisted in PostgreSQL and cached in Redis for fast retrieval
  2. Tokens are automatically refreshed before expiry without user intervention
  3. When tokens are revoked (user withdraws consent), the system detects the failure and prompts the user to reconnect their Google account — no silent failures
**Plans**: 3 plans
- [x] 17-01-PLAN.md — Token schema + OAuthCallbackResult transport pipeline ✅
- [x] 17-02-PLAN.md — GoogleTokenService: lazy refresh, Redis write-through, revocation detection ✅
- [x] 17-03-PLAN.md — Frontend revocation UX: Reconnect prompt in LinkedAccountsSection ✅

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 15 - Multi-Provider Auth Foundation + Google OAuth | 4/4 | DONE | 2026-05-16 |
| 16 - Account Linking | 3/3 | DONE | 2026-05-16 |
| 17 - Token Storage + Auto-Refresh + Revocation | 3/3 | DONE | 2026-05-16 |

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 15 | Covered |
| AUTH-02 | Phase 15 | Covered |
| AUTH-03 | Phase 15 | Covered |
| AUTH-04 | Phase 15 | Covered |
| LINK-01 | Phase 16 | Covered |
| LINK-02 | Phase 16 | Covered |
| LINK-03 | Phase 16 | Covered |
| LINK-04 | Phase 16 | Covered |
| TOKEN-01 | Phase 17 | Covered |
| TOKEN-02 | Phase 17 | Covered |
| TOKEN-03 | Phase 17 | Covered |

**Coverage:** 11/11 v1.5 requirements mapped ✓
