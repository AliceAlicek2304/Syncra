---
phase: 24-zernio-foundation
plan: "01"
subsystem: api
tags: [zernio, sdk, infrastructure, abstraction]
requires:
  - phase: 23
    provides: Serilog logging infrastructure
provides:
  - Zernio NuGet package integration in Infrastructure
  - IZernioClient abstraction in Application layer
  - Zernio DTOs for client responses
  - ZernioClient implementation using Zernio SDK
affects: [25-account-connect, 26-post-scheduling]
tech-stack:
  added: [Zernio SDK v1.0.0]
  patterns: [Interface segregation between Application and Infrastructure — mirrors StripePaymentProvider/IPaymentProvider pattern]
key-files:
  created:
    - be/src/Syncra.Application/Interfaces/IZernioClient.cs
    - be/src/Syncra.Application/DTOs/Zernio/ZernioDtos.cs
    - be/src/Syncra.Infrastructure/Services/ZernioClient.cs
  modified:
    - be/src/Syncra.Infrastructure/Syncra.Infrastructure.csproj
key-decisions:
  - "Zernio SDK is confined to Infrastructure layer — Application has zero SDK references"
  - "IZernioClient mirrors IPaymentProvider pattern: interface in Application, impl in Infrastructure"
  - "ZernioClient wraps all SDK calls in try/catch, mapping ZernioException to DomainException"
requirements-completed: [ZRNIO-02]
duration: 2min
completed: 2026-05-23
---

# Phase 24: Zernio Foundation Plan 01 — SDK Integration & Abstractions

**Zernio NuGet package in Infrastructure with IZernioClient interface, application DTOs, and SDK-wrapping client implementation**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-23T04:44:15Z
- **Completed:** 2026-05-23T04:45:45Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments
- Added Zernio NuGet package reference to Syncra.Infrastructure.csproj
- Created Zernio DTOs (ZernioConnectUrlResult, ZernioAccountDto, ZernioProfileDto) in Application layer
- Defined IZernioClient interface with GetConnectUrl, ListAccounts, DisconnectAccount, and ProvisionProfile methods
- Implemented ZernioClient in Infrastructure wrapping Zernio SDK with DomainException mapping

## Task Commits

1. **Task 1: Add Zernio NuGet package** - `2fa0a11` (feat)
2. **Task 2: Define Zernio DTOs** - `5894c9f` (feat)
3. **Task 3: Define IZernioClient interface** - `73bfaf1` (feat)
4. **Task 4: Implement ZernioClient** - `a71fad4` (feat)

## Files Created/Modified
- `be/src/Syncra.Infrastructure/Syncra.Infrastructure.csproj` - Added Zernio package reference
- `be/src/Syncra.Application/DTOs/Zernio/ZernioDtos.cs` - ZernioConnectUrlResult, ZernioAccountDto, ZernioProfileDto
- `be/src/Syncra.Application/Interfaces/IZernioClient.cs` - IZernioClient with 4 methods
- `be/src/Syncra.Infrastructure/Services/ZernioClient.cs` - SDK-wrapping implementation with DomainException mapping

## Decisions Made
- Followed IPaymentProvider pattern: interface in Application, implementation in Infrastructure
- ZernioClient injects IOptions&lt;ZernioOptions&gt; for API key (ZernioOptions created in Plan 24-02)
- All SDK exceptions mapped to DomainException for consistent error handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IZernioClient abstraction ready for consumption
- Zernio DTOs defined for account/profile data
- Waits for ZernioOptions (Plan 24-02) and EF entities (Plan 24-03)
