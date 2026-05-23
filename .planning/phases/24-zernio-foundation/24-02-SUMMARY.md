---
phase: 24-zernio-foundation
plan: "02"
subsystem: api
tags: [zernio, di, logging, serilog, redaction]
requires:
  - plan: "01"
    provides: IZernioClient interface, ZernioClient implementation, Zernio DTOs
provides:
  - ZernioOptions configuration class with SectionName and ApiKey
  - AddZernioIntegration extension method for DI registration
  - ZernioOptions destructuring policy for Serilog
  - Zernio API key redaction in RedactingEnricher (keyword + regex)
affects: [25-account-connect, 26-post-scheduling]
tech-stack:
  modified: [Serilog destructuring policies, RedactingEnricher]
key-files:
  created:
    - be/src/Syncra.Application/Options/ZernioOptions.cs
  modified:
    - be/src/Syncra.Infrastructure/Syncra.Infrastructure.csproj (Zernio SDK v1.0.0 -> v0.0.281)
    - be/src/Syncra.Infrastructure/Services/ZernioClient.cs (rewritten for real SDK API)
    - be/src/Syncra.Infrastructure/DependencyInjection.cs (added AddZernioIntegration)
    - be/src/Syncra.Api/Program.cs (calls AddZernioIntegration)
    - be/src/Syncra.Api/Logging/SensitiveDataDestructuringPolicies.cs (ZernioOptions policy)
    - be/src/Syncra.Api/Logging/RedactingEnricher.cs (keywords + regex redaction)
key-decisions:
  - "Real Zernio SDK (0.0.281) uses individual API classes (ConnectApi, AccountsApi, ProfilesApi) — not a monolithic ZernioSdk"
  - "ZernioClient rewritten to use Configuration with AccessToken, creating API instances per operation"
  - "MessageTemplate redaction uses MessageTemplateParser.Parse(redactedText) with reflection to update backing field"
requirements-completed: [ZRNIO-01, ZRNIO-03]
duration: 5min
completed: 2026-05-23
---

# Phase 24: Zernio Foundation Plan 02 — Configuration & DI

**Options binding, DI registration, Serilog destructuring policy, and regex-based API key redaction**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-23T04:46:00Z
- **Completed:** 2026-05-23T04:52:00Z
- **Tasks:** 5
- **Files modified:** 7

## Accomplishments

- Verified ZernioOptions class exists with SectionName and ApiKey properties
- Added AddZernioIntegration extension method in DependencyInjection.cs
- Registered AddZernioIntegration call in Program.cs
- Added ZernioOptions destructuring policy to SensitiveDataDestructuringPolicies.cs
- Extended RedactingEnricher with Zernio keyword redaction and regex-based `sk_[0-9a-f]{64}` redaction
- Fixed Zernio SDK version from 1.0.0 to 0.0.281 (actual latest on NuGet)
- Rewrote ZernioClient.cs to match real SDK API (individual API classes, ApiException)

## Deviations from Plan

- **Task 1 (ZernioOptions):** Already existed — no-IP.
- **Zernio SDK version:** Fixed from 1.0.0 to 0.0.281 (real SDK).
- **ZernioClient.cs:** Major rewrite required because real SDK uses per-domain API classes (ConnectApi, AccountsApi, ProfilesApi) with Configuration/AccessToken auth, ApiException, and different method signatures than originally assumed.

## Issues Encountered

1. **Zernio package 1.0.0 not found on NuGet** — Fixed by updating to 0.0.281 (latest).
2. **`using Zernio.Models` not found** — Namespace is `Zernio.Model` (singular). Also no `ZernioSdk` class.
3. **MessageTemplate constructor API** — `MessageTemplate` requires `IEnumerable<MessageTemplateToken>`, not raw string. Fixed by using `MessageTemplateParser.Parse()`.
