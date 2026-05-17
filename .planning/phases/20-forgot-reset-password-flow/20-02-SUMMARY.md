---
phase: "20"
plan: "02"
subsystem: auth
tags: [postmark, email, forgot-password, cqrs, mediatr, distributed-cache]

requires:
  - phase: "20-01"
    provides: PasswordResetToken entity, IPasswordResetTokenRepository
provides:
  - Postmark Email Service (IEmailService + PostmarkEmailService)
  - ForgotPasswordCommand + handler with rate limiting and secure token generation
  - POST /auth/forgot-password endpoint
  - Postmark configuration section
affects: [20-03, 20-04]

tech-stack:
  added: [Microsoft.Extensions.Caching.Abstractions]
  patterns: [Postmark REST API via HttpClient, SHA256 token hashing, IDistributedCache rate limiting]

key-files:
  created:
    - be/src/Syncra.Application/Options/PostmarkOptions.cs
    - be/src/Syncra.Application/Interfaces/IEmailService.cs
    - be/src/Syncra.Infrastructure/Services/PostmarkEmailService.cs
    - be/src/Syncra.Application/Features/Auth/Commands/ForgotPasswordCommand.cs
    - be/src/Syncra.Application/Features/Auth/Commands/ForgotPasswordCommandHandler.cs
    - be/tests/Syncra.UnitTests/Infrastructure/PostmarkEmailServiceTests.cs
    - be/tests/Syncra.UnitTests/Application/Options/PostmarkOptionsTests.cs
    - be/tests/Syncra.UnitTests/Application/Options/EmailServiceTests.cs
    - be/tests/Syncra.UnitTests/Application/Auth/ForgotPasswordCommandHandlerTests.cs
  modified:
    - be/src/Syncra.Infrastructure/DependencyInjection.cs
    - be/src/Syncra.Api/Controllers/AuthController.cs
    - be/src/Syncra.Api/appsettings.json
    - be/src/Syncra.Application/Syncra.Application.csproj

key-decisions:
  - "Rate limit check placed BEFORE DB user lookup to avoid timing side-channels and unnecessary queries"
  - "IDistributedCache used for rate limiting with per-email key (60-second TTL)"
  - "Token generated with RandomNumberGenerator.GetBytes(32) for 256-bit cryptographic randomness"
  - "Raw token (not hash) sent in email; SHA256 hash stored in DB"
  - "PostmarkEmailService uses IHttpClientFactory with named client (15s timeout)"
  - "Use IDistributedCache base methods (GetAsync/SetAsync) instead of extension methods for testability with Moq"

patterns-established:
  - "Email service integration via IEmailService interface + Postmark REST API"
  - "Rate limiting gated before any DB operations for consistent timing"
  - "Always return generic response regardless of email existence (no enumeration)"

requirements-completed: []

duration: 11 min
completed: 2026-05-17
---

# Phase 20 Plan 02: Postmark Email Service + Forgot Password Command Summary

**Postmark transactional email integration with IEmailService abstraction, secure forgot-password flow with cryptographic token generation, SHA256 hash storage, IDistributedCache rate limiting, and API endpoint**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-17T14:03:28+07:00
- **Completed:** 2026-05-17T14:14:06+07:00
- **Tasks:** 6
- **Files modified:** 14

## Accomplishments

- **IEmailService interface + Postmark implementation:** Branded HTML email with Syncra dark theme, reset button, 1-hour expiry notice, and plain text fallback. Integrated via HttpClient (no Postmark SDK).
- **PostmarkOptions + DI registration:** Options class with SectionName constant, configured from `"Postmark"` config section, named HttpClient with 15s timeout, scoped IEmailService registration.
- **ForgotPasswordCommand + handler:** Cryptographic 256-bit token generation (URL-safe base64), SHA256 hash storage in PasswordResetToken entity, rate limiting via IDistributedCache (60s per email), and Postmark email delivery.
- **POST /auth/forgot-password endpoint:** `[AllowAnonymous]` on AuthController, accepts email, returns generic response regardless of email existence to prevent enumeration.
- **Postmark configuration in appsettings.json:** ApiKey (empty placeholder), FromEmail, FromName sections ready for production override.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD): PostmarkOptions + IEmailService interface**
   - `c987190` (test): Add failing test for PostmarkOptions and IEmailService (RED)
   - `32c750c` (feat): Implement PostmarkOptions and IEmailService interface (GREEN)

2. **Task 2 (TDD): PostmarkEmailService**
   - `a6b30f2` (test): Add failing test for PostmarkEmailService (RED)
   - `f32fa46` (feat): Implement PostmarkEmailService (GREEN)

3. **Task 3: Register PostmarkEmailService in DI**
   - `20da2dd` (feat): Register PostmarkEmailService in DI

4. **Task 4 (TDD): ForgotPasswordCommand + handler**
   - `9bae240` (test): Add failing test for ForgotPasswordCommandHandler (RED)
   - `722fa94` (feat): Implement ForgotPasswordCommand + handler with rate limiting (GREEN)
   - `5e6c879` (fix): Update test to use IDistributedCache base methods

5. **Task 5: Add POST /auth/forgot-password endpoint**
   - `cf297aa` (feat): Add POST /auth/forgot-password endpoint

6. **Task 6: Add Postmark configuration to appsettings.json**
   - `913b9e4` (feat): Add Postmark configuration to appsettings.json

**Total commits:** 10 (3 test, 6 feat, 1 fix)

## Files Created/Modified

### New Files
- `be/src/Syncra.Application/Options/PostmarkOptions.cs` - Postmark configuration options class
- `be/src/Syncra.Application/Interfaces/IEmailService.cs` - Email service abstraction interface
- `be/src/Syncra.Infrastructure/Services/PostmarkEmailService.cs` - Postmark REST API email implementation
- `be/src/Syncra.Application/Features/Auth/Commands/ForgotPasswordCommand.cs` - Command + response records
- `be/src/Syncra.Application/Features/Auth/Commands/ForgotPasswordCommandHandler.cs` - Command handler with rate limiting, token gen, email sending
- `be/tests/Syncra.UnitTests/Infrastructure/PostmarkEmailServiceTests.cs` - 6 tests for PostmarkEmailService
- `be/tests/Syncra.UnitTests/Application/Options/PostmarkOptionsTests.cs` - 2 tests for PostmarkOptions
- `be/tests/Syncra.UnitTests/Application/Options/EmailServiceTests.cs` - 2 tests for IEmailService
- `be/tests/Syncra.UnitTests/Application/Auth/ForgotPasswordCommandHandlerTests.cs` - 5 tests for handler

### Modified Files
- `be/src/Syncra.Infrastructure/DependencyInjection.cs` - Added Postmark DI registrations
- `be/src/Syncra.Api/Controllers/AuthController.cs` - Added forgot-password endpoint
- `be/src/Syncra.Api/appsettings.json` - Added Postmark configuration section
- `be/src/Syncra.Application/Syncra.Application.csproj` - Added Microsoft.Extensions.Caching.Abstractions

## Decisions Made

- **Rate limit before DB lookup:** The handler checks rate limit FIRST via IDistributedCache before querying the database. This avoids unnecessary DB queries on rate-limited requests and prevents timing-based email enumeration.
- **IDistributedCache over IMemoryCache:** Uses the existing distributed cache infrastructure (Redis with in-memory fallback) for rate limiting, consistent with the project's existing caching patterns.
- **Base IDistributedCache methods:** Uses `GetAsync`/`SetAsync` (byte[]-based) instead of `GetStringAsync`/`SetStringAsync` extension methods to maintain testability with Moq (extension methods can't be mocked).
- **Raw token in email, hash in DB:** The 256-bit random token is sent as-is in the email URL, while only its SHA256 hash is stored in the database. This means a DB breach doesn't reveal valid reset tokens.
- **No Postmark SDK:** Postmark is integrated via simple REST API calls through HttpClient, avoiding the SDK dependency and keeping things lightweight.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing Critical] Added System.Security.Cryptography using directive**
- **Found during:** Task 4 (ForgotPasswordCommandHandler implementation)
- **Issue:** `RandomNumberGenerator` requires `using System.Security.Cryptography;` which wasn't in the plan's code
- **Fix:** Added the using directive
- **Files modified:** `ForgotPasswordCommandHandler.cs`
- **Verification:** Build succeeds
- **Committed in:** `722fa94` (part of Task 4 commit)

**2. [Rule 2 — Missing Critical] Added Microsoft.Extensions.Caching.Abstractions NuGet package**
- **Found during:** Task 4 (ForgotPasswordCommandHandler implementation)
- **Issue:** Application project didn't have `Microsoft.Extensions.Caching.Abstractions` reference needed for `IDistributedCache`
- **Fix:** Added the NuGet package to `Syncra.Application.csproj`
- **Files modified:** `Syncra.Application.csproj`
- **Verification:** Build succeeds
- **Committed in:** `722fa94` (part of Task 4 commit)

**3. [Rule 3 — Blocking] Changed IDistributedCache from extension methods to base methods**
- **Found during:** Task 4 test execution
- **Issue:** Moq cannot mock static extension methods (`GetStringAsync`/`SetStringAsync`); tests would fail
- **Fix:** Changed handler to use base interface methods (`GetAsync`/`SetAsync` with byte[]) and updated tests accordingly
- **Files modified:** `ForgotPasswordCommandHandler.cs`, `ForgotPasswordCommandHandlerTests.cs`
- **Verification:** All 5 handler tests pass
- **Committed in:** `722fa94` (part of Task 4 commit)

**4. [Rule 3 — Blocking] Moved rate limit check before DB lookup**
- **Found during:** Task 4 test execution  
- **Issue:** Handler checked DB before rate limit, causing rate-limited test (Strict mock) to fail because it expected no DB call
- **Fix:** Reordered handler to check rate limit first (also improves security by avoiding timing side-channels)
- **Files modified:** `ForgotPasswordCommandHandler.cs`
- **Verification:** All 5 handler tests pass
- **Committed in:** `722fa94` (part of Task 4 commit)

**5. [Rule 1 — Bug] appsettings.json tracked from gitignore**
- **Found during:** Task 6 commit
- **Issue:** `appsettings.json` is in `.gitignore`, so `git add` failed to stage changes
- **Fix:** Used `git add -f` to force-add the configuration template (ApiKey is empty, no secrets)
- **Files modified:** None additional
- **Verification:** File committed successfully
- **Committed in:** `913b9e4` (Task 6 commit)

**Scope Boundary Note:** Pre-existing warnings (`CS0114`, `CS0618`, `CS8634`) from other repository files were outside task scope and not addressed.

---

**Total deviations:** 5 auto-fixed (1 bug, 2 missing critical, 2 blocking)
**Impact on plan:** All fixes necessary for correctness and testability. No scope creep. Rate-limit-first reordering improves security posture.

## Issues Encountered

- **Moq + IDistributedCache incompatibility:** The `GetStringAsync`/`SetStringAsync` extension methods on `IDistributedCache` couldn't be mocked by Moq because they're static extension methods. Fixed by using the base interface methods `GetAsync`/`SetAsync` instead. This is a testability concern to be aware of for future cache-dependent code.
- **appsettings.json gitignored:** The project's `.gitignore` excludes `appsettings.json` from version control, which is standard for local development configs. Forced the commit since the config template (with empty API key) needs to be tracked.

## TDD Gate Compliance

All TDD tasks (1, 2, 4) followed RED → GREEN commit sequence:
- Task 1: `test(...)` → `feat(...)` ✓
- Task 2: `test(...)` → `feat(...)` ✓
- Task 4: `test(...)` → `feat(...)` ✓
- No REFACTOR commits needed (code clean from GREEN phase)

## User Setup Required

None - no external service configuration required. Postmark API key must be set via environment variables or user secrets in production.

## Next Phase Readiness

- Forgot password flow complete: request → token generation → hash storage → email sending → generic response
- Rate limiting functional (60s per email via IDistributedCache)
- No email enumeration vulnerability (same response regardless of email existence)
- Postmark integration via HttpClient with DI registration
- Ready for Plan 20-03: Reset Password Command + endpoint

## Self-Check: PASSED

- All 9 created files exist on disk ✓
- All 9 commits verified in git log ✓
- Full solution build: 0 errors ✓
- All 153 tests pass ✓

---

*Phase: 20-forgot-reset-password-flow*
*Completed: 2026-05-17*
