# Phase 2 Context: Architectural Refinement & Performance

## Overview
This phase focuses on improving performance by pushing logic to the database and refining the service architecture with better error handling and decoupling.

## Implementation Decisions

### 1. Database-Level Post Filtering
- **Strategy:** Utilize EF Core 8's ability to translate value object conversions into SQL.
- **Goal:** Replace in-memory filtering in `PostRepository.GetFilteredAsync` with `IQueryable` filtering.
- **Constraints:** Maintain the `ScheduledTime` Value Object in the domain model. Do not add primitive backing properties to the `Post` entity unless EF Core translation is strictly impossible.

### 2. Analytics Error Handling (Result Pattern)
- **Strategy:** Implement a lightweight custom `Result<T>` pattern.
- **Location:** `Syncra.Domain/Common/Result.cs` (to be created).
- **Scope:** Refactor `IIntegrationAnalyticsService` and `IWorkspaceAnalyticsService` to return `Result<T>` instead of empty lists or raw objects.
- **Detail:** The `Result` type should support `IsSuccess`, `Error`, and a generic `Value`.

### 3. Environment Logic Decoupling
- **Strategy:** Use the `Options` pattern for all environment-specific settings.
- **Decision:** Create `AnalyticsOptions` in `Syncra.Application/Options/`.
- **Settings:** Move `CacheTtl` from hardcoded environment checks to `AnalyticsOptions`.

### 4. Subscription Plan Lookup
- **Strategy:** Map external Stripe identifiers directly in the database.
- **Action:** Add `StripePriceId` and `StripeProductId` columns to the `plans` table.
- **Lookup:** Implement `IPlanRepository.GetByStripePriceIdAsync` to decouple subscription logic from hardcoded GUIDs.

## Reusable Assets & Patterns
- **MediatR:** Continue using the established Feature-based Command/Query pattern.
- **Value Objects:** Use existing `ValueObjectConverters` for mapping domain types to EF Core.
- **Options Pattern:** Follow the pattern used in `JwtOptions` and `StripeOptions`.

## Next Steps
1.  **Research:** Verify EF Core 8 translation for `ScheduledTime` conversion.
2.  **Planning:** Create detailed plans for each task (02-01 to 02-04).
3.  **Execution:** Implement and verify changes.
