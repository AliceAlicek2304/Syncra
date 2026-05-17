# Phase 20: Forgot/Reset Password Flow - Context

**Gathered:** 2026-05-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Email-based password reset flow with token. Users who forget their password can request a password reset email, click a secure link with a short-lived token, and set a new password. Covers: forgot password endpoint, reset password endpoint, Postmark email integration, dedicated frontend pages. Does NOT cover: change password in settings (Phase 21), email verification (Phase 22).

</domain>

<decisions>
## Implementation Decisions

### Email Delivery
- **D-01:** Use **Postmark** as the transactional email provider. Integrate via HttpClient (no heavy SDK dependency). Postmark has a simple REST API, generous free tier, and high deliverability for transactional emails.
- **D-02:** Add Postmark API configuration to `appsettings.json` (API key, sender email, sender name).

### Reset Token Strategy
- **D-03:** Random secure token stored in DB. Generate a cryptographically random token (256 bits, base64 encoded). Store SHA256 hash in a new `PasswordResetToken` table with expiry and `UsedAtUtc` nullable column — follows the existing refresh token hash pattern.
- **D-04:** Token expires in **1 hour**. Single-use — invalidated (`UsedAtUtc` set) after successful password reset.
- **D-05:** New entity: `PasswordResetToken` with fields: `Id`, `UserId`, `TokenHash`, `ExpiresAtUtc`, `UsedAtUtc`, `CreatedAtUtc`. New repository: `IPasswordResetTokenRepository` with `AddAsync`, `GetByTokenHashAsync`, `MarkAsUsedAsync`.

### Frontend UX Flow
- **D-06:** Two dedicated pages (not inline modals):
  - `/forgot-password` — Email input form. On submit, shows confirmation message ("If account exists, check email").
  - `/reset-password?token=xxx` — Token validated on page load. Shows new password + confirm password form.
- **D-07:** Add "Forgot password?" link below the password field in `LoginModal`.
- **D-08:** Both pages follow existing CSS Modules styling pattern with glass-card look.

### Security & Rate Limiting
- **D-09:** Rate limit: **1 request per email per 60 seconds**. Implement as server-side rate limiting (memory cache or Redis).
- **D-10:** Never reveal whether an email exists. Generic response: "If an account with that email exists, a password reset link has been sent."
- **D-11:** Token hashed with SHA256 before storage (same as refresh token pattern).
- **D-12:** Token invalidated after use. Expired tokens return generic "invalid or expired token" error.

### Email Template
- **D-13:** Simple branded HTML email with:
  - Syncra logo
  - Reset button (styled link)
  - Expiry notice: "This link expires in 1 hour"
  - Sender: "Syncra Support"
  - Fallback plain text version for clients that don't render HTML

### Agent's Discretion
- Exact styling of forgot/reset pages (follow existing glass-card pattern)
- Token cleanup strategy (background job to delete expired tokens vs on-read cleanup)
- Postmark API client implementation details (retry policy, error handling)
- Rate limit storage mechanism (memory vs Redis)
- Email template HTML/CSS specifics within branding constraints

</decisions>

<specifics>
## Specific Ideas

- Follow the existing `RefreshToken` entity pattern for `PasswordResetToken` — hash with SHA256, store hash, single-use semantics
- Reuse existing glass-card CSS styling from SettingsPage sections for forgot/reset pages
- Postmark API is simple REST — `POST /email` with `From`, `To`, `Subject`, `HtmlBody`, `TextBody`
- "Forgot password?" link in LoginModal should be below the password input, above the "Sign in" button

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Context
- `.planning/ROADMAP.md` — Phase 20 goal, depends on Phase 19
- `.planning/STATE.md` — Current project state, v1.5 architectural decisions

### Backend Auth Patterns
- `be/src/Syncra.Domain/Entities/User.cs` — `UpdatePassword()` method at line 69
- `be/src/Syncra.Domain/Entities/RefreshToken.cs` — Pattern for PasswordResetToken entity (SHA256 hash, expiry, single-use)
- `be/src/Syncra.Domain/Interfaces/IUserRepository.cs` — `GetByEmailAsync`, `UpdateAsync`
- `be/src/Syncra.Api/Controllers/AuthController.cs` — Existing auth endpoint patterns (MediatR, route conventions)
- `be/src/Syncra.Application/Features/Auth/Commands/LoginCommandHandler.cs` — CQRS pattern for auth commands
- `be/src/Syncra.Application/DTOs/Auth/AuthResponseDto.cs` — Auth DTO pattern

### Frontend Auth
- `fe/src/components/auth/LoginModal.tsx` — Where "Forgot password?" link will be added (line ~142)
- `fe/src/api/auth.ts` — Auth API client to extend with forgot/reset methods
- `fe/src/components/auth/LinkAccountModal.module.css` — Glass-card styling pattern reference

### Existing Hash Pattern
- `be/src/Syncra.Application/Features/Auth/Commands/LoginCommandHandler.cs` — `HashToken()` method at line 76 for SHA256 pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RefreshToken` entity pattern — SHA256 hash, `TokenHash`, `ExpiresAtUtc`, single-use — directly applicable to `PasswordResetToken`
- `IUserRepository.GetByEmailAsync()` — can find user for reset request
- `User.UpdatePassword()` — domain method ready for reset flow
- `ITokenService` — existing JWT/refresh token generation (not needed for reset tokens but useful for post-reset re-auth)
- LoginModal — existing glass-card modal where "Forgot password?" link will be added
- Glass-card CSS modules — reusable styling pattern for forgot/reset pages

### Established Patterns
- MediatR CQRS for auth commands (`LoginCommand`, `RegisterCommand`)
- Result pattern with DTOs for API responses
- React Hook Form + Zod for form validation
- CSS Modules for component styling
- Custom JWT auth pipeline (no ASP.NET Core Identity)

### Integration Points
- New `AuthController` endpoints: `POST /auth/forgot-password`, `POST /auth/reset-password`
- New `ForgotPasswordCommand` + handler, `ResetPasswordCommand` + handler
- New `PasswordResetToken` entity + EF Core configuration + migration
- New `IPasswordResetTokenRepository` + implementation
- Postmark API client registration in `DependencyInjection.cs`
- `fe/src/App.tsx` — add routes for `/forgot-password` and `/reset-password`
- LoginModal — add "Forgot password?" link
- `fe/src/api/auth.ts` — add `forgotPassword`, `resetPassword` methods

</code_context>

<deferred>
## Deferred Ideas

- **Postmark infrastructure as separate phase** — API key provisioning, config setup, email domain verification could be its own phase
- **Reusable email template library** — Build a shared email template system for future email types (welcome emails, verification emails, notifications) rather than one-off templates per phase

</deferred>

---

*Phase: 20-forgot-reset-password-flow*
*Context gathered: 2026-05-17*
