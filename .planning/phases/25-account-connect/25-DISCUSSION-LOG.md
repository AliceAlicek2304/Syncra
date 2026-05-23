# Phase 25: Account Connect - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 25-account-connect
**Areas discussed:** OAuth Connection Strategy & Syncing, Billing Gate Handling, Webhook Processing Flow, Connected Accounts Listing & Deletion UX

---

## OAuth Connection Strategy & Syncing

| Option | Description | Selected |
|--------|-------------|----------|
| Standard Mode | Zernio hosts the selection UI; user is redirected back afterwards. | |
| Headless Mode | Syncra builds a custom UI for selecting pages/orgs. | ✓ |
| You decide | Let the agent choose the best path. | |

**User's choice:** Headless Mode: Syncra builds a custom UI for selecting pages/orgs.
**Notes:** Decided to build custom UI select components for platforms with secondary selection (Facebook, LinkedIn, etc.) to deliver a highly branded and premium UX.

---

## Secondary Selection UI Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated Selection Page | Redirect the user to a dedicated page `/social-accounts/select` to choose. | ✓ |
| Modal overlay on Settings Page | Return to the settings page and open an interactive modal with the list. | |
| You decide | Let the agent design the optimal flow. | |

**User's choice:** Dedicated Selection Page: Redirect the user to a dedicated page `/social-accounts/select` to choose.
**Notes:** A separate dedicated selection page keeps the Settings page clean and makes the OAuth redirect handling simpler.

---

## Zernio Profile Provisioning

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy/Automatic on first Connect | Provision a Zernio Profile on the fly when the user clicks 'Connect Account' for the first time. | ✓ |
| Explicit Provisioning | Create a separate 'Setup' step/endpoint, requiring a profile to exist before connecting. | |
| You decide | Let the agent determine the best provisioning flow. | |

**User's choice:** Lazy/Automatic on first Connect: Provision a Zernio Profile on the fly when the user clicks 'Connect Account' for the first time.
**Notes:** Smooth setup flow with zero setup friction for new workspaces.

---

## OAuth State Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Short-lived temporary state in Redis | Store a state identifier in Redis to correlate and validate callbacks. | ✓ |
| Stateless OAuth State Parameter | Pass state metadata (like Workspace ID) securely in the OAuth state parameter. | |
| You decide | Let the agent choose. | |

**User's choice:** Short-lived temporary state in Redis: Store a state identifier in Redis to correlate and validate callbacks.
**Notes:** Strong security and cleaner URL structures by correlating returning callbacks against a secure temporary record in Redis.

---

## Billing Gate Handling (402 PAYMENT_REQUIRED)

| Option | Description | Selected |
|--------|-------------|----------|
| Return 402 Payment Required | Throw a custom ZernioBillingRequiredException mapped to HTTP 402 with billing metadata. | ✓ |
| Return 400 Bad Request | Map the error to HTTP 400 Bad Request containing the code and redirect URL. | |
| You decide | Let the agent decide the exception mapping. | |

**User's choice:** Return 402 Payment Required: Throw a custom ZernioBillingRequiredException mapped to HTTP 402 with billing metadata.
**Notes:** Returning standard 402 ensures precise HTTP semantic routing.

---

## 402 UI Representation

| Option | Description | Selected |
|--------|-------------|----------|
| Actionable Modal Overlay | Show a dedicated dialog explaining why the connection is blocked, with a button to go to Zernio's billing page. | ✓ |
| Toast Notification | Display a warning toast message with a clickable redirect link inside. | |
| You decide | Let the agent design the presentation. | |

**User's choice:** Actionable Modal Overlay: Show a dedicated dialog explaining why the connection is blocked, with a button to go to Zernio's billing page.
**Notes:** Prevents accidental navigation and guides the user transparently with custom messaging before they leave Syncra.

---

## Billing Gate Logging

| Option | Description | Selected |
|--------|-------------|----------|
| Log as Warning in Serilog | Write a warning log to Serilog for tracing, without DB persistence. | ✓ |
| Audit Log | Save a record in the Syncra database audit log table for analytics. | |
| You decide | Let the agent determine the logging strategy. | |

**User's choice:** Log as Warning in Serilog: Write a warning log to Serilog for tracing, without DB persistence.
**Notes:** Tracing billing issues is essential, but local logs are sufficient without DB tables overhead.

---

## Billing Errors during Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Unified error handling | Use the same modal overlay on the selection page to show the billing warning and redirect button. | ✓ |
| Redirect back to Settings | Redirect back to settings page with error query parameters and show a warning banner. | |
| You decide | Let the agent handle it. | |

**User's choice:** Unified error handling: Use the same modal overlay on the selection page to show the billing warning and redirect button.
**Notes:** Unified experience for all billing-related connection blocks.

---

## Webhook Execution Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Asynchronous via Hangfire | Enqueue the webhook payload into a Hangfire background job, return HTTP 200 immediately to Zernio, and process asynchronously. | ✓ |
| Synchronous Processing | Process the webhook synchronously on the incoming request thread, and return HTTP 200 only when complete. | |
| You decide | Let the agent choose. | |

**User's choice:** Asynchronous via Hangfire: Enqueue the webhook payload into a Hangfire background job, return HTTP 200 immediately to Zernio, and process asynchronously.
**Notes:** Minimizes webhook request timeout issues and handles retries gracefully.

---

## Webhook Signature Verification

| Option | Description | Selected |
|--------|-------------|----------|
| Action Filter | Verify the signature in a reusable custom Action Filter (e.g. ZernioWebhookSignatureFilter) protecting the endpoint. | ✓ |
| Inline Controller Logic | Verify the signature directly inside the Webhook controller action method. | |
| You decide | Let the agent decide. | |

**User's choice:** Action Filter: Verify the signature in a reusable custom Action Filter (e.g. ZernioWebhookSignatureFilter) protecting the endpoint.
**Notes:** Clean controller code through declarative attributes.

---

## Webhook Idempotency Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Redis Lock + DB Unique Index | Acquire a Redis lock and insert to ZernioWebhookEvent table with a unique index. Returns 200 immediately if duplicate. | ✓ |
| DB Unique Index Only | Rely on standard DB unique constraints and handle DbUpdateException to ignore duplicate events. | |
| You decide | Let the agent decide. | |

**User's choice:** Redis Lock + DB Unique Index: Acquire a Redis lock and insert to ZernioWebhookEvent table with a unique index. Returns 200 immediately if duplicate.
**Notes:** Prevents race conditions and duplicate processing.

---

## Webhook Job Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Automatic Retries + Status Update | Let Hangfire automatically retry the job. If all retries fail, mark the ZernioWebhookEvent status as 'Failed' and store the error logs in the record. | ✓ |
| Disable Retries | Immediately mark the webhook event as 'Failed' in the database without any background retries. | |
| You decide | Let the agent decide. | |

**User's choice:** Automatic Retries + Status Update: Let Hangfire automatically retry the job. If all retries fail, mark the ZernioWebhookEvent status as 'Failed' and store the error logs in the record.
**Notes:** Transient errors (DB lockups, network blips) auto-recover.

---

## Account Listing Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Query Local Database Only | Fetch accounts from the local 'social_accounts' table. Fast and performant, relying on webhooks to keep it synchronized. | ✓ |
| Live-Sync on Page Load | Call Zernio's API to list accounts and update the local DB on every page load to guarantee consistency. | |
| You decide | Let the agent decide. | |

**User's choice:** Query Local Database Only: Fetch accounts from the local 'social_accounts' table. Fast and performant, relying on webhooks to keep it synchronized.
**Notes:** Focuses on responsiveness and database indexing rather than calling external APIs on every dashboard render.

---

## Account Disconnection Database Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Call Zernio API + Soft Delete | Call Zernio API to disconnect, then soft-delete or deactivate the local SocialAccount record (preserving history). | ✓ |
| Call Zernio API + Hard Delete | Call Zernio API to disconnect, then permanently delete the SocialAccount record from the database. | |
| You decide | Let the agent decide. | |

**User's choice:** Call Zernio API + Soft Delete: Call Zernio API to disconnect, then soft-delete or deactivate the local SocialAccount record (preserving history).
**Notes:** Keeps historical data and avoids foreign key orphan issues in analytics tables.

---

## Pending Posts on Account Disconnection

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel pending posts + Warn user | Warn the user before deletion that scheduled posts for this account will be cancelled, then mark them as cancelled on delete. | ✓ |
| Block Deletion | Prevent the user from disconnecting the account until all pending scheduled posts are cancelled or published. | |
| You decide | Let the agent decide. | |

**User's choice:** Cancel pending posts + Warn user: Warn the user before deletion that scheduled posts for this account will be cancelled, then mark them as cancelled on delete.
**Notes:** Prevents unexpected failures of scheduled posts when the targeted provider target is suddenly gone.

---

## Social Accounts UI Design

| Option | Description | Selected |
|--------|-------------|----------|
| Grid of platform cards | Display cards for all 14 platforms in a grid, showing connected accounts under each with individual platform connect buttons. | ✓ |
| Unified List | Show a clean, unified table or list of currently connected accounts with a single general 'Connect New Account' dropdown. | |
| You decide | Let the agent design the UI layout. | |

**User's choice:** Grid of platform cards: Display cards for all 14 platforms in a grid, showing connected accounts under each with individual platform connect buttons.
**Notes:** High visual impact, showing all integration capabilities transparently.

---

## The Agent's Discretion

- The exact key schema and TTL (suggested 15 mins) for OAuth state correlation in Redis.
- The styling, icons, and micro-animations of the social account card grid and selection layouts.
- The structure of the Hangfire background job parameters and error logging schema.

## Deferred Ideas

- None — discussion stayed within phase scope.

---

*Phase: 25-account-connect*
*Discussion log generated: 2026-05-23*
