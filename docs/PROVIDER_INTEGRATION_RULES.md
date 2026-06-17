# Syncra Provider Integration Rules

## Purpose

This document defines mandatory rules for all integrations with external providers, including:

* Zernio
* Facebook
* TikTok
* LinkedIn
* YouTube
* Stripe
* Postmark
* Gemini
* Any future third-party service

These rules exist to prevent vendor lock-in, reduce production incidents, improve debugging, and ensure long-term maintainability.

---

# Rule 1 — Domain Owns The Business Logic

Business logic must never depend directly on a provider implementation.

BAD

Application
→ ZernioClient
→ Zernio API

GOOD

Application
→ Provider Abstraction
→ Provider Adapter
→ External API

Example:

Application
→ ISocialPublishingService
→ ZernioPublishingAdapter
→ Zernio API

Handlers should depend on abstractions, not provider SDKs or clients.

---

# Rule 2 — External APIs Are Never Source Of Truth

Provider responses must never be treated as the primary source of truth.

Syncra owns:

* Post Status
* Subscription Status
* Connection Status
* Analytics Snapshots

Provider responses are only inputs.

BAD

Post.Status = zernioResponse.Status

GOOD

Map provider response into Syncra domain status.

Example:

Provider Status
→ Published

Syncra Status
→ Published

Provider Status
→ Queued

Syncra Status
→ Publishing

---

# Rule 3 — Every External Object Requires Internal And External IDs

Every provider object must store:

* Internal Id
* External Id

Examples:

Post

* Id
* ZernioPostId

SocialAccount

* Id
* ExternalAccountId

PostPlatformTarget

* Id
* ExternalPostId

Never rely solely on provider identifiers.

---

# Rule 4 — Provider Failures Must Be Logged

Every failed provider request must be traceable.

Required fields:

* Provider
* Endpoint
* RequestId
* WorkspaceId
* UserId
* StatusCode
* ErrorMessage
* Timestamp

The system must allow investigation of failures without reproducing the issue.

---

# Rule 5 — All External Calls Must Be Resilient

Retry only transient failures.

Retry:

* 429
* 500
* 502
* 503
* Network timeout

Do Not Retry:

* 400
* 401
* 403
* Validation errors

Use exponential backoff.

Infinite retry loops are forbidden.

---

# Rule 6 — Webhooks Must Be Idempotent

All webhook handlers must be safe when receiving duplicate events.

A webhook may arrive:

* Once
* Twice
* Multiple times

Processing the same event repeatedly must not corrupt state.

Required:

* Idempotency Key
* Event Deduplication
* Event Tracking

---

# Rule 7 — Assume Provider Failure

Every provider integration must assume:

* Downtime
* Partial responses
* Invalid responses
* Missing fields
* Timeouts
* Rate limits

Never assume a provider is always available.

Graceful degradation is required.

---

# Rule 8 — Platform Differences Must Be Isolated

Platform-specific behavior must not be scattered throughout the codebase.

BAD

if (platform == TikTok)
if (platform == Facebook)
if (platform == LinkedIn)

inside handlers.

GOOD

TikTokPublishStrategy

FacebookPublishStrategy

LinkedInPublishStrategy

YouTubePublishStrategy

Use Strategy Pattern or equivalent abstraction.

---

# Rule 9 — No Vendor Lock-In

The system must be capable of replacing a provider without rewriting business logic.

Required structure:

Domain
→ Provider Abstraction
→ Provider Adapter
→ External Provider

Example:

ISocialPublishingProvider

ZernioPublishingProvider

FutureProviderPublishingProvider

Business logic must not know which provider is used.

---

# Rule 10 — Publish Audit Trail Is Mandatory

Every publish attempt must be traceable.

Required states:

Requested
UploadedMedia
SubmittedToProvider
Publishing
Published
Failed
Retried

Store:

* Platform
* Workspace
* Post
* Error
* Timestamp

This audit trail is required for production debugging.

---

# Rule 11 — Media Must Be Verified Before Publish

Before sending media to a provider:

Verify:

* File Exists
* MIME Type
* File Size
* Platform Limits
* Media Accessibility

Publishing must fail fast when media validation fails.

---

# Rule 12 — Provider Test Matrix Must Exist

Every platform requires a test matrix.

Facebook

* Connect
* Reconnect
* Text Post
* Image Post
* Video Post
* Schedule Post

TikTok

* Connect
* Video Post
* Slideshow Post
* Schedule Post

LinkedIn

* Connect
* Text Post
* Image Post

YouTube

* Connect
* Video Upload
* Schedule Publish

A feature is not considered complete until its matrix passes.

---

# Rule 13 — Observability First

All provider operations must support:

* Structured Logging
* Correlation IDs
* Audit Logs
* Failure Tracking

Production debugging must not depend on manual reproduction.

---

# Rule 14 — Security

Never expose:

* Access Tokens
* Refresh Tokens
* Secrets
* API Keys

in:

* Logs
* API Responses
* Exceptions
* Frontend Payloads

Secrets must remain encrypted at rest.

---

# Rule 15 — Production Readiness Criteria

A provider integration is considered production-ready only when:

* Connection Flow Works
* Token Refresh Works
* Publish Flow Works
* Retry Works
* Audit Trail Exists
* Logging Exists
* Test Matrix Passes
* Failure Recovery Works

Until then, the integration is considered experimental.
