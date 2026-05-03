# Codebase Concerns

**Analysis Date:** 2025-03-03

## Tech Debt

**Large Frontend Components and Hooks:**
- Issue: Several frontend files have grown significantly, mixing UI logic, state management, and mock data.
- Files: `fe/src/pages/app/CalendarPage.tsx` (884 lines), `fe/src/pages/app/IdeasPage.tsx` (589 lines), `fe/src/components/create-post/useCreatePostState.ts` (575 lines).
- Impact: Increased maintenance difficulty, higher risk of side effects during modifications, and slower developer onboarding.
- Fix approach: Extract sub-components from pages, break down large hooks into smaller, specialized hooks (e.g., separating AI logic from post state).

**Local Filesystem Storage:**
- Issue: `LocalMediaStorage` saves files to the local disk.
- Files: `be/src/Syncra.Infrastructure/Storage/LocalMediaStorage.cs`
- Impact: Prevents horizontal scaling. In a multi-instance deployment, files saved on one instance won't be accessible by others.
- Fix approach: Implement an `S3StorageService` (or similar cloud provider) and configure it for production environments.

**Pervasive Mock Data in Frontend:**
- Issue: Many features still rely on mock data or merge mock data with live data.
- Files: `fe/src/data/mockAI.ts`, `fe/src/data/mockCoachTrends.ts`, `fe/src/pages/app/CalendarPage.tsx`
- Impact: Confusion between real and simulated behavior; risk of mocks leaking into production.
- Fix approach: Finalize backend integrations for AI generating and analytics features; remove mock data providers.

## Security Considerations

**Weak JWT Configuration Fallback:**
- Issue: JWT authentication allows a null secret, which disables signing key validation.
- Files: `be/src/Syncra.Api/DependencyInjection.cs`
- Risk: If the secret is not properly configured in production, the system might accept invalid tokens.
- Current mitigation: Validation logic exists but has a conditional check for null secret.
- Recommendations: Enforce a non-empty secret in all environments except perhaps local development; use a mandatory configuration check on startup.

**Minimal Password Strength Enforcement:**
- Issue: `RegisterDto` only requires a minimum length of 8 characters.
- Files: `be/src/Syncra.Application/DTOs/RegisterDto.cs`
- Risk: Users may choose weak, easily guessable passwords.
- Current mitigation: Basic length check.
- Recommendations: Implement a more robust password policy (complexity requirements) using FluentValidation or custom attributes.

## Performance Bottlenecks

**Distributed Lock Reliability:**
- Issue: `RedisDistributedLockService` falls back to `NoOpLock` (which always succeeds) if Redis is unavailable.
- Files: `be/src/Syncra.Infrastructure/Services/RedisDistributedLockService.cs`
- Cause: Designed to allow the system to continue working even if Redis is down.
- Impact: In high-concurrency scenarios (like webhook processing), this could lead to race conditions or duplicate processing if Redis is unavailable.
- Improvement path: Consider failing or retrying instead of a No-Op if the operation strictly requires a lock, or use a database-backed lock as a secondary fallback.

## Fragile Areas

**Social Integration Adapters:**
- Issue: Each social platform has a specific adapter implementation with different timeout requirements and error handling.
- Files: `be/src/Syncra.Infrastructure/Publishing/Adapters/`
- Why fragile: Changes to external APIs (TikTok, Facebook, etc.) can break these adapters easily.
- Safe modification: Ensure every adapter has comprehensive unit tests and use the existing retry/policy wrappers.
- Test coverage: Gaps exist in end-to-end testing with actual provider sandbox environments.

## Test Coverage Gaps

**Frontend Testing:**
- What's not tested: Virtually the entire React frontend has no unit or integration tests.
- Files: `fe/src/**/*.tsx`, `fe/src/**/*.ts`
- Risk: UI regressions are common and difficult to catch without manual testing of every flow.
- Priority: High (for core state logic like `useCreatePostState`).

---

*Concerns audit: 2025-03-03*
