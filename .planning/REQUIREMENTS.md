# Requirements: Syncra.NET

**Defined:** 2026-05-16
**Core Value:** Social media scheduling and management platform with robust API

## v1.5 Requirements

Requirements for v1.5 Google Auth & Calendar Integration milestone. Each maps to roadmap phases.

### Google OAuth Authentication

- [ ] **AUTH-01**: User can sign up with Google account (auto-create account from Google profile data)
- [ ] **AUTH-02**: User can sign in with Google account (existing Google-linked account)
- [ ] **AUTH-03**: User profile data (name, avatar, email) imported from Google on first login
- [ ] **AUTH-04**: Multi-provider abstraction (IOAuthProvider interface) supports adding future providers (GitHub, Microsoft, Apple)

### Password Management

- [ ] **AUTH-05**: Authenticated user can change their password (requires current password verification).
- [ ] **AUTH-06**: OAuth-only users can set a password for the first time (does not require current password, but requires active session).

### Account Linking

- [ ] **LINK-01**: System detects email collision when Google email matches existing email/password account
- [ ] **LINK-02**: User prompted to verify ownership via password before linking Google to existing account
- [ ] **LINK-03**: User can view linked accounts (Google, email/password) in settings
- [ ] **LINK-04**: User can unlink Google account from existing account

### Token Management

- [ ] **TOKEN-01**: Google OAuth access and refresh tokens stored in PostgreSQL (durable) with Redis caching (fast retrieval)
- [ ] **TOKEN-02**: Google OAuth tokens auto-refresh before expiry using existing IntegrationTokenRefreshService pattern
- [ ] **TOKEN-03**: Token revocation handled gracefully — user re-prompted for Google consent when tokens are revoked

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Google Calendar Integration

- **CAL-01**: User can connect Google Calendar to view events in the app
- **CAL-02**: Calendar events displayed alongside scheduled posts
- **CAL-03**: Incremental sync tokens for efficient calendar re-fetching

### Additional Auth Providers

- **PROV-01**: User can sign in with GitHub account
- **PROV-02**: User can sign in with Microsoft account

## Out of Scope

| Feature | Reason |
|---------|--------|
| Google Calendar integration | User explicitly removed from v1.5 scope |
| ASP.NET Core Identity | Existing custom JWT auth system works; adding Identity would be a breaking rewrite |
| Google Calendar write-back | High complexity, requires additional consent flows, deferred to v2+ |
| Real-time calendar sync | Webhooks require HTTPS endpoint and 7-day channel renewal; polling sufficient for v2 |
| Mobile app | Web-first, mobile later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 15 | Pending |
| AUTH-02 | Phase 15 | Pending |
| AUTH-03 | Phase 15 | Pending |
| AUTH-04 | Phase 15 | Pending |
| AUTH-05 | Phase 21 | Pending |
| AUTH-06 | Phase 21 | Pending |
| LINK-01 | Phase 16 | Pending |
| LINK-02 | Phase 16 | Pending |
| LINK-03 | Phase 16 | Pending |
| LINK-04 | Phase 16 | Pending |
| TOKEN-01 | Phase 17 | Pending |
| TOKEN-02 | Phase 17 | Pending |
| TOKEN-03 | Phase 17 | Pending |

**Coverage:**
- v1.5 requirements: 11 total
- Mapped to phases: 11 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-16*
*Last updated: 2026-05-16 after roadmap creation (11/11 requirements mapped)*
