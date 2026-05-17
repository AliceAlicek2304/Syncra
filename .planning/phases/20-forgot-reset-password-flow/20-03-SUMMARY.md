---
phase: "20"
plan: "03"
subsystem: backend-api
tags: [password-reset, reset-password, command-handler, session-invalidation, tdd]

# Dependency graph
requires:
  - phase: 20-01
    provides: PasswordResetToken entity and repository (token validation, MarkAsUsed)
  - phase: 20-02
    provides: ForgotPassword command (complementary flow for generating reset tokens)
provides:
  - ResetPasswordCommand + ResetPasswordCommandHandler (token validation → BCrypt hash → password update → token consumption → session invalidation)
  - POST /auth/reset-password API endpoint with [AllowAnonymous]
  - IUserSessionRepository.InvalidateAllForUserAsync (revoke all active sessions for a user)
  - UserSession domain behavior Revoke() method
affects: [20-04, frontend reset-password UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CQRS command handler with multiple repository dependencies (_tokenRepository, _userRepository, _sessionRepository)
    - SHA256 token hashing for DB lookup (same pattern as ForgotPasswordCommandHandler)
    - Generic DomainException for invalid/expired tokens (dark pattern D-12: don't reveal WHICH condition failed)
    - Session invalidation on password change (security: terminate all active sessions after reset)
    - TDD (RED/GREEN) for CQRS command handler with Moq Strict mocks

key-files:
  created:
    - be/src/Syncra.Application/Features/Auth/Commands/ResetPasswordCommand.cs
    - be/src/Syncra.Application/Features/Auth/Commands/ResetPasswordCommandHandler.cs
    - be/tests/Syncra.UnitTests/Application/Auth/ResetPasswordCommandHandlerTests.cs
  modified:
    - be/src/Syncra.Domain/Entities/UserSession.cs
    - be/src/Syncra.Domain/Interfaces/IUserSessionRepository.cs
    - be/src/Syncra.Infrastructure/Repositories/UserSessionRepository.cs
    - be/src/Syncra.Api/Controllers/AuthController.cs

key-decisions:
  - "ResetPasswordCommand returns Unit (MediatR void) — endpoint returns 200 on success, ExceptionFilter catches DomainException for 400"
  - "InvalidateAllForUserAsync loads active sessions via EF Core and calls Revoke() on each (consistent with domain-driven session management)"
  - "Added Revoke() domain behavior to UserSession entity (missing from codebase, needed by InvalidateAllForUserAsync)"

patterns-established:
  - "Command handler TDD pattern: Moq Strict mocks with FluentAssertions, verifying repository interactions via Verify()"

requirements-completed: []

# Metrics
duration: 12 min
completed: 2026-05-17
---

# Phase 20 Plan 03: ResetPassword Command + Endpoint Summary

**ResetPasswordCommand + handler with token validation (SHA256 hash lookup), BCrypt password hashing, single-use token consumption, and full session invalidation — plus POST /auth/reset-password API endpoint**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-17T07:33:30Z
- **Completed:** 2026-05-17T07:45:30Z
- **Tasks:** 3 (Task 3 executed first as dependency)
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments

- ResetPasswordCommand record (sealed record with Token and NewPassword) implementing IRequest<Unit>
- ResetPasswordCommandHandler: SHA256-hashes the token for DB lookup, validates via IsValid check (not expired, not used), BCrypt-hashes new password, calls User.UpdatePassword, marks token as used (MarkAsUsed), invalidates all active user sessions, persists via SaveChangesAsync
- POST /auth/reset-password endpoint with [AllowAnonymous] and ResetPasswordRequest DTO
- IUserSessionRepository.InvalidateAllForUserAsync implementation loading active sessions and calling Revoke() on each
- UserSession.Revoke() domain behavior (sets RevokedAtUtc + UpdatedAtUtc)
- 6 passing tests (TDD): command structure, valid token flow, invalid/expired/used token errors, handler type checking
- 159 total tests pass across the full suite

## Task Commits

Each task was committed atomically (TDD tasks have RED + GREEN commits):

1. **Task 3: Add InvalidateAllForUserAsync to session repository** — `0defd9b` (feat) + `Revoke() on UserSession` (Rule 2 auto-fix)
2. **Task 1 (RED): Add failing test for ResetPasswordCommand + handler** — `afab352` (test)
3. **Task 1 (GREEN): Implement ResetPasswordCommandHandler** — `87e6890` (feat)
4. **Task 2: Add POST /auth/reset-password endpoint** — `a59dca3` (feat)

## Files Created/Modified

### Created
- `be/src/Syncra.Application/Features/Auth/Commands/ResetPasswordCommand.cs` — Command record with Token and NewPassword fields, returns Unit
- `be/src/Syncra.Application/Features/Auth/Commands/ResetPasswordCommandHandler.cs` — Handler with full token validation, BCrypt hashing, session invalidation
- `be/tests/Syncra.UnitTests/Application/Auth/ResetPasswordCommandHandlerTests.cs` — 6 TDD tests for command structure and handler behavior

### Modified
- `be/src/Syncra.Domain/Entities/UserSession.cs` — Added Revoke() domain behavior (Rule 2 auto-fix)
- `be/src/Syncra.Domain/Interfaces/IUserSessionRepository.cs` — Added InvalidateAllForUserAsync(Guid userId) method
- `be/src/Syncra.Infrastructure/Repositories/UserSessionRepository.cs` — Implemented InvalidateAllForUserAsync with EF Core query and Revoke() calls
- `be/src/Syncra.Api/Controllers/AuthController.cs` — Added ResetPassword endpoint and ResetPasswordRequest DTO

## Decisions Made

- **ResetPasswordCommand returns Unit:** The handler doesn't need to return data — success/failure is communicated via HTTP status code (200/400). The ExceptionFilter handles DomainException -> 400 mapping.
- **InvalidateAllForUserAsync loads active sessions in memory:** Instead of using ExecuteUpdateAsync (bulk update), the plan's recommended approach loads sessions and calls Revoke() on each. This is consistent with domain-driven patterns where Revoke() behavior is on the entity.
- **Revoke() added to UserSession:** The entity didn't have a Revoke() domain method, which was needed for the session invalidation pattern. Added as a missing critical functionality (Rule 2).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Revoke() method to UserSession entity**
- **Found during:** Task 3 (pre-requisite for Task 1 handler)
- **Issue:** The plan's InvalidateAllForUserAsync code calls `session.Revoke()`, but the UserSession entity had no Revoke() method. Without it, the repository implementation wouldn't compile.
- **Fix:** Added `public void Revoke()` to UserSession.cs that sets `RevokedAtUtc = DateTime.UtcNow; UpdatedAtUtc = DateTime.UtcNow;`
- **Files modified:** be/src/Syncra.Domain/Entities/UserSession.cs
- **Verification:** Build succeeds, tests pass
- **Committed in:** 0defd9b (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (missing critical)
**Impact on plan:** Necessary for correctness — the repository code calling Revoke() would not have compiled without this entity method. No scope creep.

## Issues Encountered

None — all tasks completed without issues.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (Task 1) | `afab352` | ✓ |
| GREEN (Task 1) | `87e6890` | ✓ |

TDD task completed with proper RED/GREEN gate sequence. No REFACTOR phase needed — implementation was clean.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Reset password flow complete for the backend. Ready for Plan 20-04 (frontend reset password UI or email template integration). The complementary ForgotPassword flow (Plan 20-02) generates tokens; this plan consumes them.

---

## Self-Check: PASSED

- [x] All 7 task files exist on disk (verified)
- [x] 4 commits verified in git log
- [x] Full API project builds successfully
- [x] Full test project builds successfully
- [x] All 159 tests pass (6 new + 153 existing)

---

*Phase: 20-forgot-reset-password-flow*
*Completed: 2026-05-17*
