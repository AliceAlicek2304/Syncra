# Requirements: Syncra.NET v2.0 — Zernio API Integration

## Overview

Replace individual platform API integrations with Zernio's unified API — enabling cross-platform post scheduling, analytics, and inbox across all 14 supported platforms from a single client.

**Milestone:** v2.0 Zernio API Integration  
**Started:** 2026-05-23  
**Zernio platforms:** Twitter/X, Instagram, WhatsApp, Facebook, LinkedIn, TikTok, YouTube, Pinterest, Reddit, Bluesky, Threads, Google Business, Telegram, Snapchat, Discord

---

## Active Requirements

### Foundation (ZRNIO)

- [ ] **ZRNIO-01**: User can configure Zernio API key per environment (stored in secrets, never hardcoded)
- [ ] **ZRNIO-02**: System initializes Zernio SDK client with workspace-scoped Zernio Profile auto-provisioned on first use
- [ ] **ZRNIO-03**: Zernio API key (`sk_[64 hex]`) is redacted in all Serilog log output
- [ ] **ZRNIO-04**: System auto-provisions a Zernio Profile per Workspace on first Zernio operation

### Account Connect (CONN)

- [ ] **CONN-01**: User can initiate OAuth connection for any Zernio-supported social platform (14 platforms)
- [ ] **CONN-02**: User can view all connected social accounts per workspace
- [ ] **CONN-03**: User can disconnect a social account from workspace
- [ ] **CONN-04**: System handles Zernio billing gates (`twitter_passthrough`, `free_tier_exceeded`) with user-facing error message and redirect URL
- [ ] **CONN-05**: System syncs account status via `account.connected` / `account.disconnected` webhook events

### Post Scheduling (POST)

- [ ] **POST-01**: User can schedule a post to one or more connected accounts across multiple platforms via Zernio
- [ ] **POST-02**: User can publish a post immediately across multiple platforms
- [ ] **POST-03**: System tracks per-platform post outcomes (Published, Failed, Partial) stored as `PostPlatformTarget` records
- [ ] **POST-04**: User can retry a failed post without duplicating content on already-published platforms
- [ ] **POST-05**: User can delete a scheduled post

### Analytics (ANLYT)

- [ ] **ANLYT-01**: User can view post performance metrics (impressions, engagements, clicks) sourced from Zernio
- [ ] **ANLYT-02**: User can view daily engagement stats across all connected accounts
- [ ] **ANLYT-03**: User can view best posting times per platform

### Webhooks (HOOK)

- [ ] **HOOK-01**: System verifies Zernio webhook HMAC-SHA256 signatures via `X-Zernio-Signature` header
- [ ] **HOOK-02**: System processes post lifecycle events: `post.scheduled`, `post.published`, `post.failed`, `post.partial`, `post.cancelled`
- [ ] **HOOK-03**: System deduplicates webhook deliveries using `X-Zernio-Event-Id` header (idempotency table)
- [ ] **HOOK-04**: System handles per-platform events `post.platform.published` and `post.platform.failed` to update individual `PostPlatformTarget` records

### Inbox (INBX)

- [ ] **INBX-01**: User can view unified DM conversations across all connected accounts
- [ ] **INBX-02**: User can send a DM reply from the inbox
- [ ] **INBX-03**: User can view comments on posts across all connected accounts
- [ ] **INBX-04**: User can reply to a comment
- [ ] **INBX-05**: User can view reviews (Facebook / Google Business) and reply to them

---

## Future Requirements (Deferred)

- Broadcasts (bulk messaging to contacts) — requires Contacts CRM (v2.1)
- Sequences (drip campaigns with timed steps) — requires Contacts CRM (v2.1)
- Contacts CRM (cross-platform contact management) — v2.1 prerequisite
- Queue / auto-scheduling time slots — v2.1
- Comment-to-DM automations — v2.1

---

## Out of Scope

- **Ads management** — Ads (Meta, Google, TikTok, LinkedIn, Pinterest, X ad networks) is a separate product milestone with dedicated billing gates. Excluded from v2.0.
- **WhatsApp advanced features** — Template management, phone number provisioning, WhatsApp Flows require async Meta approval cycles. Excluded from v2.0; basic WhatsApp posting via unified Posts API is in scope.
- **Mobile app** — Web-first approach (carried from v1.x).
- **Google Calendar integration** — Removed from scope in v1.5; remains excluded.
- **Additional auth providers (GitHub, Microsoft, Apple)** — Not a v2.0 priority.

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ZRNIO-01 | 24 | Pending |
| ZRNIO-02 | 24 | Pending |
| ZRNIO-03 | 24 | Pending |
| ZRNIO-04 | 24 | Pending |
| CONN-01 | 25 | Pending |
| CONN-02 | 25 | Pending |
| CONN-03 | 25 | Pending |
| CONN-04 | 25 | Pending |
| CONN-05 | 25 | Pending |
| POST-01 | 26 | Pending |
| POST-02 | 26 | Pending |
| POST-03 | 26 | Pending |
| POST-04 | 26 | Pending |
| POST-05 | 26 | Pending |
| ANLYT-01 | 27 | Pending |
| ANLYT-02 | 27 | Pending |
| ANLYT-03 | 27 | Pending |
| HOOK-01 | 25 | Pending |
| HOOK-02 | 26 | Pending |
| HOOK-03 | 25 | Pending |
| HOOK-04 | 26 | Pending |
| INBX-01 | 28 | Pending |
| INBX-02 | 28 | Pending |
| INBX-03 | 28 | Pending |
| INBX-04 | 28 | Pending |
| INBX-05 | 28 | Pending |
