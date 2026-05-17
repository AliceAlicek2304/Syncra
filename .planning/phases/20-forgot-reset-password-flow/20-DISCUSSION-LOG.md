# Phase 20: Forgot/Reset Password Flow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-17
**Phase:** 20-forgot-reset-password-flow
**Areas discussed:** Email delivery approach, Reset token strategy, Frontend UX flow, Rate limiting & security, Email template & content

---

## Email Delivery Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | Modern transactional email API, simple REST, generous free tier | |
| SendGrid | Mature provider, .NET SDK, more complex | |
| SMTP via MailKit | Self-hosted, ops overhead, no external API dependency | |
| Console/debug for now | Log reset link to console, no real email | |
| **Postmark** | User provided URL: postmarkapp.com/pricing | ✓ |

**User's choice:** Postmark (transactional email API)
**Notes:** User specified postmarkapp.com. Integrate via simple HttpClient, no SDK.

---

## Reset Token Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| **Random token stored in DB** | SHA256 hash, PasswordResetToken table, single-use | ✓ |
| JWT-based reset token | Short-lived JWT, no DB storage, can't invalidate individually | |
| Code-based (PIN) | 6-digit code sent to email, no URL handling | |

**User's choice:** Random token stored in DB with SHA256 hash
**Notes:** Follow existing RefreshToken pattern. New entity + migration needed.

---

## Frontend UX Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline modal flow | Forgot form in existing LoginModal (step 2) | |
| **Dedicated forgot page** | /forgot-password + /reset-password?token=xxx | ✓ |

**User's choice:** Dedicated pages
**Notes:** Two SPA routes, separate from LoginModal. Link in LoginModal navigates to /forgot-password.

---

## Rate Limiting & Security

| Option | Description | Selected |
|--------|-------------|----------|
| **Standard security** | 1 req/email/60s, 1hr token expiry, don't reveal email exists, hash token, invalidate after use | ✓ |
| Strict security | + IP limiting, 15min token, CAPTCHA, lockout | |
| Relaxed (dev-friendly) | Reveal email existence, 24h token, no rate limit | |

**User's choice:** Standard security
**Notes:** Good balance. Rate limit via memory cache or Redis. Generic "If account exists" messages.

---

## Email Template & Content

| Option | Description | Selected |
|--------|-------------|----------|
| **Simple branded HTML** | Syncra logo, reset button, expiry notice, sender info | ✓ |
| Plain text only | No HTML, simplest implementation | |
| Minimal HTML | Light styling, no button, clickable text link | |

**User's choice:** Simple branded HTML with reset button
**Notes:** Include plain text fallback. Logo, button, 1hr expiry notice.

---

## Deferred Ideas

- **Postmark setup as separate phase** — API key provisioning, config setup, domain verification
- **Reusable email template library** — Build shared template system for future email types (welcome, verification, notifications)
