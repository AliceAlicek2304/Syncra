---
phase: 25-account-connect
plan: 25-02-webhook-processing
subsystem: backend-jobs
tags: [hangfire, webhook, social-account, domain-entity]
dependency_graph:
  requires:
    - 25-01-webhook-intake-PLAN.md
  provides:
    - ProcessZernioWebhookJob (full Hangfire job implementation)
    - SocialAccount.Reactivate() domain method
  affects:
    - SocialAccount entity (new method)
    - DependencyInjection.AddZernioIntegration (new scoped registration)
tech_stack:
  added: []
  patterns:
    - "Hangfire AutomaticRetry attribute for bounded retry loops"
    - "JsonDocument.Parse for webhook payload extraction"
    - "PostPlatformTarget.Platform as the join key between Post and SocialAccount for platform-targeted queries"
key_files:
  created: []
  modified:
    - be/src/Syncra.Domain/Entities/SocialAccount.cs
    - be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs
    - be/src/Syncra.Infrastructure/DependencyInjection.cs
decisions:
  - "Used PostPlatformTarget.Platform as the join between Post and SocialAccount for account.disconnected unscheduling — Post has no direct SocialAccountId column; this is the correct schema-consistent approach"
  - "Used AppDbContext directly (not IUnitOfWork) in ProcessZernioWebhookJob to match the pattern established by ZernioWebhookController (plan 25-01) and the existing stub"
  - "On exception, save the MarkFailed call using CancellationToken.None to avoid losing error state if the original token was already cancelled"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-05-23"
  tasks_completed: 3
  files_modified: 3
---

# Phase 25 Plan 02: Webhook Processing Summary

**One-liner:** Hangfire job that provisions/reactivates SocialAccounts on `account.connected` and soft-deactivates + unschedules platform-targeted posts on `account.disconnected`, with 3-attempt retry and 500-char error truncation.

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Add Reactivate() to SocialAccount | Done | 3a5509c |
| 2 | Implement ProcessZernioWebhookJob | Done | 3a5509c |
| 3 | Register ProcessZernioWebhookJob in DI | Done | 3a5509c |

## What Was Built

### Task 1 — SocialAccount.Reactivate()

Added `Reactivate()` method to `be/src/Syncra.Domain/Entities/SocialAccount.cs` mirroring the pattern from `ZernioProfile.Reactivate()`:

```csharp
public void Reactivate()
{
    if (IsActive) return;
    IsActive = true;
    UpdatedAtUtc = DateTime.UtcNow;
}
```

### Task 2 — ProcessZernioWebhookJob (full implementation)

Replaced the 25-01 stub at `be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs` with the full job:

- Decorated with `[AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]` (T-25-02-02)
- Signature matches `public async Task ExecuteAsync(Guid webhookEventId, CancellationToken cancellationToken = default)`
- Parses JSON payload using `JsonDocument`; extracts `account.platform` and `account.accountId`
- `account.connected` handler: looks up SocialAccount by WorkspaceId + Platform + ExternalAccountId; calls `SocialAccount.Create` if new; calls `account.Reactivate()` + `account.Update(...)` if existing
- `account.disconnected` handler: calls `account.Deactivate()`; queries Posts in workspace with Status==Scheduled having a `PostPlatformTarget` for the same platform; calls `post.Unschedule()` on each
- Marks event `Processed` on success; marks event `Failed` with truncated error (500 chars max) and rethrows on exception (T-25-02-03)
- All DB queries scoped to `webhookEvent.WorkspaceId` for tenant isolation (T-25-02-01)

### Task 3 — DI Registration

Added `services.AddScoped<ProcessZernioWebhookJob>();` to `AddZernioIntegration` in `DependencyInjection.cs`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Post has no SocialAccountId column**
- **Found during:** Task 2
- **Issue:** The plan specified filtering posts by `SocialAccountId`, but `Post.cs` has no such property. The relationship between posts and social accounts is via `PostPlatformTarget.Platform` (string).
- **Fix:** For `account.disconnected`, posts are unscheduled by querying `Posts` where `WorkspaceId` matches, `Status == Scheduled`, and `PlatformTargets.Any(t => t.Platform == account.Platform)`.
- **Files modified:** `be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs`
- **Commit:** 3a5509c

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-25-02-01 | All DB queries for SocialAccount and Post lookup are scoped to `webhookEvent.WorkspaceId` |
| T-25-02-02 | `[AutomaticRetry(Attempts = 3, OnAttemptsExceeded = AttemptsExceededAction.Fail)]` applied |
| T-25-02-03 | `ZernioWebhookEvent.MarkFailed(ex.Message, utcNow)` truncates at 500 chars via the existing domain method |

## Known Stubs

None — all logic is fully wired.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced.

## Self-Check: PASSED

- `be/src/Syncra.Domain/Entities/SocialAccount.cs` — Reactivate() method present
- `be/src/Syncra.Infrastructure/Jobs/ProcessZernioWebhookJob.cs` — full implementation, [AutomaticRetry] decorated
- `be/src/Syncra.Infrastructure/DependencyInjection.cs` — AddScoped<ProcessZernioWebhookJob>() registered
- Commit 3a5509c verified in git log
- `dotnet build` from Syncra.Api: 0 errors
