# Feature Landscape: Zernio API Integration (v2.0)

**Domain:** Social media scheduling platform — Zernio API integration layer
**Researched:** 2026-05-23
**Scope:** New capabilities only. Existing features (scheduling, analytics, Redis caching, multi-tenant workspace, auth, billing, logging) are already built and out of scope here.

---

## Concept Mapping: Zernio to Syncra

Understanding how Zernio's data model maps to Syncra's existing multi-tenant workspace model is the foundation for every feature decision below.

### Zernio's Data Hierarchy

```
Zernio API Key (belongs to a Zernio user account)
  └── Profiles (brand/project containers — e.g. "Company Brand", "Personal")
        └── Accounts (connected social accounts, e.g. @company on Twitter, @company on Instagram)
              └── Posts (scheduled or published content targeting one or more accounts)
```

### Syncra's Existing Data Hierarchy

```
User (authenticated via JWT/OAuth)
  └── Workspace (multi-tenant boundary — one per team/organization)
        └── SocialAccount (platform credentials, currently using direct OAuth tokens)
              └── Post (scheduled or published content, stored in Syncra DB)
```

### The Mapping

| Zernio Concept | Syncra Equivalent | Notes |
|----------------|-------------------|-------|
| **Zernio API Key** | Workspace-level secret | One Zernio API key per Syncra Workspace. Stored encrypted (existing IDataProtector pattern). |
| **Profile** | Workspace | Syncra Workspace maps 1:1 to a Zernio Profile. Create one Profile per Workspace on Zernio during workspace setup. Store `ZernioProfileId` on the `Workspace` entity. |
| **Account** | SocialAccount | Each Zernio Account maps to a Syncra `SocialAccount`. Store `ZernioAccountId` on the `SocialAccount` entity. The Zernio Account is created via the Connect OAuth flow. |
| **Post (Zernio)** | Post (Syncra) | Syncra's existing `Post` entity is the source of truth for metadata; Zernio's `Post._id` is stored as `ZernioPostId` on the Syncra `Post` for status sync and webhook correlation. |
| **Queue** | (New concept) | Zernio Queue is recurring time slots for auto-scheduling. Syncra has no equivalent. A new `QueueSlot` concept would be needed if this feature is built. |

### Key Architectural Constraint

Zernio pricing is **per connected account** ($6/account/month in the 3–10 range, free for the first 2). Each Syncra Workspace that connects social accounts via Zernio incurs Zernio costs. Syncra must store the `ZernioProfileId` per Workspace and provision it lazily (create on first Connect attempt, not at workspace creation). This avoids paying for Zernio Profiles for workspaces that never use social posting.

### Connect OAuth Flow — User-Facing Steps

The user experience for connecting a social account via Zernio Connect:

1. User navigates to Settings → Social Accounts → "Connect New Account"
2. User selects platform (e.g. Instagram)
3. Syncra backend calls `GET /v1/connect/{platform}?profileId={zernioProfileId}` with Syncra's Zernio API key
4. Zernio returns an `authUrl` (a platform-native OAuth redirect URL)
5. Syncra redirects the user (or opens a popup) to `authUrl`
6. User completes OAuth on the platform (e.g. Instagram login + grant permissions)
7. Platform redirects back to Zernio's callback URL — Zernio handles the token exchange internally
8. Zernio fires the `account.connected` webhook to Syncra's registered webhook endpoint
9. Syncra receives the webhook, creates/updates the `SocialAccount` record with the new `ZernioAccountId`
10. UI updates to show the connected account (via webhook → SignalR/SSE push, or polling)

**Important:** Syncra never sees or stores raw platform OAuth tokens. Zernio holds them. Syncra only needs `ZernioAccountId` to target posts. This dramatically simplifies Syncra's token management surface for social platforms — the pattern Syncra built for Google OAuth (IDataProtector, token refresh) does NOT need to be replicated for the 14 Zernio-managed platforms.

**Special case — Twitter/X:** Zernio requires a card on file before connecting any X account (`twitter_passthrough` billing gate). Syncra must handle the `402 PAYMENT_REQUIRED` response from the Connect endpoint and surface the `dashboard_url` to redirect the user to Zernio's billing page.

**Special case — Facebook:** After the user grants the token, Zernio returns a short-lived `connectToken` and a list of Pages the user administers. Syncra must present a page-selection step and call the page-selection endpoint before the connection is finalized.

---

## Table Stakes

Features that Syncra MUST have to function as a social media scheduling app after the Zernio migration. Missing any of these makes the platform non-functional.

| Feature | Why Expected | Complexity | Depends On | Notes |
|---------|--------------|------------|------------|-------|
| **Zernio .NET SDK + IZernioClient abstraction** | All other features require an API client | Medium | Nothing | `dotnet add package Zernio`. Wrap in `IZernioClient` interface following Syncra's existing provider pattern (IPaymentProvider, IAuthProvider). Register with DI. |
| **Profile provisioning per Workspace** | Zernio Accounts must belong to a Profile; without a Profile, no accounts can be connected | Low | IZernioClient | Create Zernio Profile lazily on first Connect initiation. Store `ZernioProfileId` on `Workspace` entity. |
| **Connect OAuth flow (link social accounts)** | Users cannot post without connected accounts | Medium | IZernioClient, Workspace Profile provisioning | Handle `authUrl` redirect, `account.connected` webhook confirmation, `402` billing gate for X, Facebook page-selection extra step. |
| **Post scheduling via Zernio** | Core product function — cross-platform scheduling in one call | Medium | IZernioClient, SocialAccount.ZernioAccountId | Call Zernio `POST /v1/post` with `socialAccountIds` array. Store `ZernioPostId` on existing `Post` entity. Single Zernio API call replaces N platform-specific calls. |
| **Post status sync via webhooks** | Users need to know if posts published or failed | Medium | Webhook endpoint, HMAC verification | Handle `post.published`, `post.failed`, `post.partial`, `post.platform.published`, `post.platform.failed`. Update `Post.Status` in Syncra DB. Use `ZernioPostId` for correlation. |
| **Account disconnection detection** | Expired/revoked platform tokens surface to users so they can reconnect | Low | Webhook endpoint | Handle `account.disconnected` webhook. Mark `SocialAccount` as disconnected. Surface reconnect CTA. `disconnectionType: unintentional` means token expired. |
| **Post retry on failure** | Users expect to retry failed posts without recreating them | Low | IZernioClient | `POST /v1/post/{id}/retry`. Wire into existing post management UI. |
| **Post delete (cancel scheduled)** | Users expect to cancel a scheduled post | Low | IZernioClient | `DELETE /v1/post/{id}`. Mirror to Syncra DB status. |
| **List connected accounts** | Users must be able to see which accounts are connected | Low | IZernioClient | `GET /v1/accounts`. Used to populate platform selectors in the post composer. |

---

## Differentiators

Features that Zernio enables beyond basic scheduling. Not universally expected, but materially increase the platform's value.

| Feature | Value Proposition | Complexity | Depends On | Notes |
|---------|-------------------|------------|------------|-------|
| **Analytics via Zernio (post metrics)** | Per-post performance metrics (impressions, likes, reach, clicks) across all platforms from one API | Medium | IZernioClient, SocialAccount.ZernioAccountId | `GET /v1/analytics/posts` and `GET /v1/analytics`. Augments existing Redis-cached analytics. LinkedIn personal accounts: only tracks posts published through Zernio (platform API limit). Google Business per-post analytics deprecated by Google — location-level metrics available instead. |
| **Best-time analysis** | Tells users when to post per platform based on engagement data | Low | IZernioClient | `GET /v1/analytics/best-time`. Single endpoint. Renders as a heatmap or time-slot recommendation in the post composer. |
| **Unified Inbox — DMs** | Manage all incoming direct messages from all platforms without leaving Syncra | High | IZernioClient, `message.received` webhook | `GET /v1/messages/conversations`, `POST /v1/messages/{conversationId}`. Real-time new-message push via `message.received` webhook → SignalR/SSE. Requires pagination. Inbox included in paid Zernio accounts. |
| **Unified Inbox — Comments** | Reply to post comments across Instagram, Facebook, Twitter, YouTube, LinkedIn, Bluesky, Reddit in one place | High | IZernioClient, `comment.received` webhook | `GET /v1/comments`, `POST /v1/comments/{postId}/reply`. `comment.received` webhook provides real-time notification. Ad context included on paid-post comments. |
| **Unified Inbox — Reviews** | Reply to Facebook Page reviews and Google Business reviews in one place | Medium | IZernioClient, `review.new` webhook | `GET /v1/reviews`, `POST /v1/reviews/{reviewId}/reply`. Narrower scope than DMs/comments — only Facebook Pages and Google Business. |
| **Queue / auto-scheduling slots** | Users define recurring time slots; Zernio auto-fills with the next draft in the queue | Medium | IZernioClient, new `QueueSlot` concept in Syncra | `GET/POST/DELETE /v1/queue`. New data model concept with no existing Syncra equivalent. Requires UI for defining slots per platform per account. |
| **Webhook management** | Users/admins can configure which events trigger notifications | Low | Webhook entity in DB | `POST/PATCH /v1/webhooks`. Syncra manages one webhook endpoint per installation. Expose event subscription management in admin settings. |
| **Publishing logs** | Transparency for failures — shows raw platform API request/response, HTTP status, duration | Low | IZernioClient | `GET /v1/logs`. 7-day retention on Zernio side. Useful for debugging publish failures without contacting support. |
| **Bulk CSV post upload** | Agency use case — schedule many posts across platforms from a spreadsheet | Medium | IZernioClient | `POST /v1/post/bulk` (CSV multipart). Returns `BulkUploadResult` with per-row success/error codes. Handles rate-limit errors per account in the response. |

---

## Advanced / Deferred Features

These are technically available via Zernio but have higher integration complexity or scope that warrants explicit deferral to a later milestone.

| Feature | Why Defer | Complexity | What It Enables |
|---------|-----------|------------|-----------------|
| **Broadcasts** (bulk DM campaigns) | Requires Contacts CRM first; WhatsApp broadcasts need Meta-approved templates (async approval workflow) | High | Send bulk DMs to a contact list — marketing/promotional use case |
| **Sequences** (drip campaigns) | Requires Contacts CRM; complex enrollment/unenrollment/exit-on-reply lifecycle; new scheduling paradigm | High | Automated timed message series — retention/nurture use case |
| **Contacts CRM** | Entirely new data domain with custom fields, channels, bulk import; not a scheduling concern | High | Foundation for Broadcasts and Sequences. Cross-platform contact management. |
| **Comment Automations** | Instagram/Facebook only; requires platform post ID; DM reply logic with button templates | Medium | Auto-DM users who comment specific keywords — lead generation automation |
| **Ads management** | Separate complex product surface; six ad networks; own billing model; audiences/pixels/campaigns | Very High | Create, boost, pause ads across Meta/Google/TikTok/LinkedIn/Pinterest/X |
| **WhatsApp advanced features** | WhatsApp Business numbers are $2/month separately; template approval workflow is async with Meta; Flow builder (native WA forms) is a product in itself | Very High | WhatsApp templates, Flows (interactive forms inside WhatsApp), broadcast to phone numbers |
| **Google Business Profile extras** | GMB food menus, attributes, place actions, location details — vertical-specific for restaurants/local business | Medium | Rich GMB profile management beyond basic posting |
| **Demographics analytics** | Instagram follower demographics, YouTube demographics require 100+ followers and extra OAuth scope | Low | Audience breakdown by age/gender/country for audience insight features |
| **Twitter/X engagement endpoints** | Paid per-call X API passthrough cost (e.g. $0.005 per read, $0.015 per tweet creation) adds unpredictable cost per user action | Medium | Retweet, bookmark, follow automation |

---

## Anti-Features

Features to explicitly avoid in v2.0.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Store raw platform OAuth tokens** | Zernio holds social platform tokens; Syncra's value proposition is that it does NOT need to manage them | Store only `ZernioAccountId`. Zernio handles all token refresh and revocation for the 14 social platforms. |
| **Per-user Zernio API keys** | Syncra is multi-tenant; cost and account management is at the Workspace level | One encrypted API key per Workspace entity. Users within a Workspace share the same Zernio Profile. |
| **Polling for post status** | Webhooks are provided and efficient; polling wastes Zernio API rate-limit budget (60–1200 req/min per tier) | Use `post.published` / `post.failed` / `post.partial` webhooks exclusively for status updates. |
| **Expose Zernio internal IDs in Syncra's public API** | `ZernioProfileId`, `ZernioAccountId`, `ZernioPostId` are internal implementation details | Map through Syncra entity IDs. Only Syncra IDs are public. Zernio IDs are private fields on entities. |
| **One Zernio Profile per social account** | Profiles are brand containers for multiple accounts; over-granular profiling creates unnecessary overhead | One Profile per Workspace, all of that Workspace's accounts belong to the same Profile. |
| **Build ads in v2.0** | Ads is a separate, complex product surface that would consume the entire v2.0 scope | Defer to a dedicated future milestone. Zernio Ads add-on is already bundled with paid accounts. |

---

## Feature Dependencies

```
IZernioClient abstraction (ZERNIO-01)
  └── Profile provisioning per Workspace
        └── Connect OAuth flow (ZERNIO-04)
              └── account.connected / account.disconnected webhooks (ZERNIO-05)
                    └── Post scheduling via Zernio (ZERNIO-02)
                    |     └── post.published / post.failed / post.partial webhooks (ZERNIO-05)
                    |     └── Post retry / delete
                    |     └── Bulk CSV upload
                    |
                    └── Analytics via Zernio (ZERNIO-03)
                    |     └── Best-time analysis
                    |     └── Publishing logs
                    |
                    └── Unified Inbox (ZERNIO-06)
                          └── DMs (message.received webhook)
                          └── Comments (comment.received webhook)
                          └── Reviews (review.new webhook)
                          └── [DEFERRED] Broadcasts → requires Contacts CRM
                          └── [DEFERRED] Sequences → requires Contacts CRM + Broadcasts
```

**Webhooks (ZERNIO-05) are cross-cutting.** The webhook endpoint, HMAC-SHA256 verification, and idempotency infrastructure should be built as a shared foundation in ZERNIO-05 and reused by every subsequent feature. Syncra already has an IdempotencyRecord pattern (from Stripe webhooks) — apply the same pattern here using the `X-Zernio-Event-Id` header as the deduplication key.

---

## MVP Recommendation

### Must deliver (v2.0 complete)

1. **ZERNIO-01** — IZernioClient + .NET SDK + Workspace Profile provisioning
2. **ZERNIO-04** — Connect OAuth flow for all 14 platforms (including X billing gate + Facebook page selection)
3. **ZERNIO-05** — Webhook infrastructure: HMAC verification, idempotency, `post.*` events, `account.*` events
4. **ZERNIO-02** — Post scheduling via Zernio (replaces direct platform API calls)
5. **ZERNIO-03** — Analytics via Zernio (post metrics + best-time analysis)
6. **ZERNIO-06** — Unified Inbox (DMs + Comments + Reviews)

### Defer to v2.1

- **ZERNIO-07** — Broadcasts and Sequences (requires Contacts CRM scoping first)
- Queue / auto-scheduling slots (medium effort, lower priority than Inbox)
- Bulk CSV upload (agency use case, not core)

### Defer to future milestones

- Ads management (separate milestone)
- WhatsApp advanced features (separate milestone)
- Contacts CRM (prerequisite for Broadcasts/Sequences)

---

## Sources

- Zernio API Documentation (`D:\Code\Syncra\zernio-api-documentation.md`) — HIGH confidence (official docs)
- Zernio OpenAPI Specification v1.0.4 (`D:\Code\Syncra\zernio-api-openapi.yaml`) — HIGH confidence (official spec)
- Syncra PROJECT.md (`D:\Code\Syncra\.planning\PROJECT.md`) — HIGH confidence (existing system state)
