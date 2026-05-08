# Phase 6: Webhook Reliability & Idempotency — Research

**Researched:** 2026-05-01
**Status:** Complete

## 1. Redis Distributed Lock Strategy (D-10)

### Current State
- Project uses `Microsoft.Extensions.Caching.StackExchangeRedis` v8.0.0 via `IDistributedCache`
- Redis config in `RedisOptions.cs` — `Host`, `Port`, `Password`, `Database`
- DI registration in `Infrastructure/DependencyInjection.cs` lines 63-76 uses `AddStackExchangeRedisCache`
- **No distributed lock library** currently installed

### Options Evaluated

| Option | Package | Approach | Pros | Cons |
|--------|---------|----------|------|------|
| A. RedLock.net | `RedLock.net` | Redlock algorithm | Multi-instance safe, well-tested | Requires `IConnectionMultiplexer`, overkill for single-node Redis |
| B. StackExchange.Redis native | `StackExchange.Redis` (already transitive dep) | `SET key NX EX` via `IDatabase.StringSetAsync` | No new packages, lightweight | Need to register `IConnectionMultiplexer` directly |
| C. Medallion.Threading.Redis | `Medallion.Threading.Redis` | Wraps Redis SET NX with IDistributedLock interface | Clean `IDistributedLock` abstraction, testable | Additional dependency |

### Recommendation: Option B — StackExchange.Redis native lock

**Rationale:**
- `StackExchange.Redis` is already a transitive dependency via `Microsoft.Extensions.Caching.StackExchangeRedis`
- For single-node Redis (current setup), `SET key value NX EX 30` is the standard Redis distributed lock pattern
- Requires registering `IConnectionMultiplexer` as a singleton in DI, then injecting into `PaymentWebhookOrchestrator`
- Lock pattern: acquire → process → release (with try/finally), timeout = 30s per D-10

### Implementation Pattern
```csharp
// Acquire lock
var lockKey = $"webhook_lock:{idempotencyKey}";
var lockValue = Guid.NewGuid().ToString();
var acquired = await db.StringSetAsync(lockKey, lockValue, TimeSpan.FromSeconds(30), When.NotExists);
if (!acquired)
{
    // Another instance is processing — return 200 (safe to acknowledge)
    return new OkResult();
}

try
{
    // ... process webhook ...
}
finally
{
    // Release lock only if we still own it (Lua script for atomicity)
    var script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
    await db.ScriptEvaluateAsync(script, new RedisKey[] { lockKey }, new RedisValue[] { lockValue });
}
```

### DI Registration Required
```csharp
// In Infrastructure/DependencyInjection.cs
services.AddSingleton<IConnectionMultiplexer>(sp =>
    ConnectionMultiplexer.Connect(redisOptions.ConnectionString));
```

**Fallback behavior:** When Redis is unavailable (in-memory cache fallback path), skip the distributed lock and rely on the UNIQUE INDEX on `IdempotencyRecord.Key` as the safety net (D-11). This matches the existing `AddDistributedMemoryCache()` fallback pattern.

---

## 2. IdempotencyRecord Schema Changes (D-02, D-03, D-04)

### Current Entity (`IdempotencyRecord.cs`)
```
Fields: WorkspaceId, UserId, Key, RequestHash, Endpoint, Method, Status,
        ResponseStatusCode, ResponseBody, LockedUntilUtc, CompletedAtUtc, ExpiresAtUtc
```

### Required Additions

| Field | Type | Default | Column Name | Purpose |
|-------|------|---------|-------------|---------|
| `AttemptCount` | `int` | `0` | `attempt_count` | Track retry count (D-02, threshold=5) |
| `LastError` | `string?` | `null` | `last_error` | JSON: `{ message, exceptionType, truncatedStackTrace, attemptTimestamp }` (D-03) |

### IdempotencyStatus Enum Change (D-02)
Current: `Pending=1, Success=2, Failure=3`
Add: `PermanentFailure=4`

### ExpiresAtUtc Default Change (D-04)
Current in `PaymentWebhookOrchestrator.cs` line 88: `DateTime.UtcNow.AddDays(7)`
Change to: `DateTime.UtcNow.AddDays(30)`

### EF Core Configuration Updates (`UtilityConfigurations.cs`)
```csharp
builder.Property(e => e.AttemptCount).HasDefaultValue(0).HasColumnName("attempt_count");
builder.Property(e => e.LastError).HasColumnType("jsonb").HasColumnName("last_error");
```

### Migration Required
- New EF Core migration: `AddWebhookReliabilityFields`
- Adds `attempt_count` (int, default 0) and `last_error` (jsonb, nullable) columns
- Existing unique index on `Key` already exists (line 68 of UtilityConfigurations.cs) — D-11 satisfied

---

## 3. Timestamp Guard Pattern (D-05, D-06)

### Current State
- `StripeSubscriptionWebhookHandlers.cs` does plain upsert — no timestamp protection
- `Subscription` entity has no `LastEventTimestampUtc` field
- `Plan` entity has no `LastEventTimestampUtc` field

### Implementation Approach

**Add `LastEventTimestampUtc` to entities (D-06):**
- `Subscription` — receives `customer.subscription.created/updated/deleted` events
- `Plan` — receives `price.created/updated/deleted` and `product.updated/deleted` events

**Guard logic in handlers:**
```csharp
var eventTimestamp = webhookEvent.EventCreatedAtUtc; // from Stripe event's `created` field

if (existing.LastEventTimestampUtc.HasValue && eventTimestamp < existing.LastEventTimestampUtc.Value)
{
    _logger.LogInformation("Skipping stale event {EventId} — local timestamp {Local} >= event {Event}",
        webhookEvent.EventId, existing.LastEventTimestampUtc, eventTimestamp);
    return; // Skip — we already have a newer state
}

// Apply update...
existing.LastEventTimestampUtc = eventTimestamp;
```

**Where `EventCreatedAtUtc` comes from:**
- Stripe's `Event.Created` is a Unix timestamp (seconds since epoch)
- `PaymentWebhookEvent` DTO needs a new `DateTime? EventCreatedAtUtc` property
- `StripePaymentProvider.ParseWebhookAsync` maps `stripeEvent.Created` → `EventCreatedAtUtc`

### Entities Requiring Timestamp Guard (D-06)
- `Subscription` — `LastEventTimestampUtc` (DateTime?)
- `Plan` — `LastEventTimestampUtc` (DateTime?)

### Migration Impact
- Two new nullable DateTime columns on `subscriptions` and `plans` tables

---

## 4. PaymentWebhookOrchestrator Rework (D-01, D-02, D-10)

### Current Flow (PaymentWebhookOrchestrator.cs)
```
Parse → Check idempotency (DB) → Dispatch → Update status → Return
```

### New Flow
```
Parse → Acquire Redis lock → Check idempotency (DB) → Check attempt count
  → Dispatch → Update status (success) → Release lock → Return 200
  On failure:
    → Increment AttemptCount → Store LastError → Check threshold
      → If AttemptCount >= 5: Status=PermanentFailure, return 200 (D-02)
      → Else: Status=Failure, return 500 (D-01, triggers Stripe retry)
    → Release lock
```

### Key Behavioral Changes
1. **Return 500 on failure** (D-01) — currently throws, outer catch returns 500 with `ex.ToString()`. Change to structured error (no stack trace leak).
2. **PermanentFailure after 5 attempts** (D-02) — return 200 to stop Stripe retries
3. **Redis lock wraps entire idempotency flow** (D-10) — prevents races between concurrent deliveries
4. **DB unique index as safety net** (D-11) — catch `DbUpdateException` for duplicate key → return 200

---

## 5. Admin API Endpoints (D-08, D-09)

### Existing Admin Pattern
- `AdminStripeSyncController.cs` — `[Route("api/admin/stripe")]`, no auth (development-only)
- Uses `AppDbContext` directly (no repository)

### New Controller: `AdminWebhookController`

**Endpoint 1 (D-08): `GET /api/admin/webhooks/failed`**
```
Query params: page (default 1), pageSize (default 20), status (filter), key (search)
Returns: paginated list of IdempotencyRecords with Status = Failure or PermanentFailure
```

**Endpoint 2 (D-09): `POST /api/admin/webhooks/{id}/reset`**
```
Resets: Status=Pending, AttemptCount=0, LockedUntilUtc=null, LastError=null
Admin uses Stripe Dashboard to resend the payload after reset.
```

### Design Decisions
- Follow `AdminStripeSyncController` pattern — `[ApiController]`, direct `AppDbContext` injection
- No authorization decorator (matches existing admin pattern — will be addressed in a separate security phase)
- Read-only query uses `AsNoTracking()` for performance
- Reset endpoint returns 404 if record not found

---

## 6. PaymentWebhookEvent DTO Changes

### Current DTO
The `PaymentWebhookEvent` record/class needs `EventCreatedAtUtc` for timestamp guards.

### Required Addition
```csharp
public DateTime? EventCreatedAtUtc { get; init; }
```

### StripePaymentProvider Mapping
In `ParseWebhookAsync`, map Stripe's `Event.Created` (which is already a `DateTime` in the Stripe.net SDK) to `EventCreatedAtUtc`.

---

## 7. Test Strategy

### Integration Tests Needed (from REQ 3.1)
1. **Idempotency replay**: Send same webhook payload twice → confirm single side-effect
2. **PermanentFailure threshold**: Simulate 5 failures → confirm 200 response and PermanentFailure status
3. **Timestamp guard**: Send older event after newer → confirm skip
4. **Admin reset**: Reset a failed record → confirm fields cleared
5. **Concurrent delivery**: Verify lock prevents race (harder to test — may need mock Redis)

### Existing Test Infrastructure
- Unit tests in `tests/Syncra.UnitTests/`
- No existing webhook-specific tests found
- MediatR + handler pattern makes unit testing straightforward (mock repositories)

---

## 8. Dependency Chain

```
Wave 1: Schema changes (entity + enum + migration + DTO)
Wave 2: Redis lock setup (DI + lock service) + Timestamp guards (handlers)
Wave 3: Orchestrator rework (uses lock + schema + guards)
Wave 4: Admin API (reads from new schema)
Wave 5: Tests (validates all above)
```

---

## Validation Architecture

### Dimension Coverage

| Dimension | How Validated |
|-----------|--------------|
| Schema correctness | EF migration applies cleanly; `dotnet ef database update` succeeds |
| Idempotency | Integration test replays same event — single DB row |
| Failure handling | Unit test simulates handler exception — AttemptCount increments, LastError populated |
| PermanentFailure | Unit test simulates 5 failures — status transitions, 200 returned |
| Timestamp guard | Unit test sends old event — update skipped, log emitted |
| Redis lock | Unit test with mock IConnectionMultiplexer — lock acquired/released |
| Admin read | Integration test queries failed records — correct filtering |
| Admin reset | Integration test resets record — fields cleared |
| Concurrent safety | DB unique index constraint test — duplicate insert → caught gracefully |

---

## RESEARCH COMPLETE
