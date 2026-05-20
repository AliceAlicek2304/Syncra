---
phase: 23-configure-logging-serilog
plan: 01
subsystem: backend
tags: [logging, serilog, observability]
requires: [LOGGING-01, LOGGING-02]
provides:
  - "Production JSON file logging with daily rotation, 30-day retention, 100MB max size"
  - "Development human-readable console output at Debug level"
  - "Request-scoped UserId enrichment via middleware"
  - "Environment, MachineName, Application properties on every log event"
affects:
  - "Serilog configuration in appsettings.json and appsettings.Development.json"
  - "Middleware pipeline order (UserIdEnricher before CorrelationIdMiddleware)"
tech-stack:
  added:
    - "Serilog.Sinks.File 7.0.0"
    - "Serilog.Formatting.Compact 3.0.0"
    - "Serilog.Enrichers.Environment 3.0.1"
    - "Serilog.Sinks.Async 2.1.0"
  patterns:
    - "Async-wrapped file sink to avoid request latency from disk I/O"
    - "Middleware-based LogContext enrichment (same pattern as CorrelationIdMiddleware)"
    - "Configuration-driven Serilog setup via ReadFrom.Configuration"
key-files:
  created:
    - "be/src/Syncra.Api/Logging/UserIdEnricher.cs"
  modified:
    - "be/src/Syncra.Api/Syncra.Api.csproj"
    - "be/src/Syncra.Api/appsettings.json"
    - "be/src/Syncra.Api/appsettings.Development.json"
    - "be/src/Syncra.Api/Program.cs"
key-decisions:
  - "Serilog.Sinks.File version 7.0.0 required by Serilog.AspNetCore 10.0.0 transitive dependency (NU1605 error at 6.0.0)"
  - "File sink path set to 'logs/log-.txt' with Serilog's built-in rolling interval pattern"
  - "UserIdEnricher reads ClaimTypes.NameIdentifier first, falls back to 'sub' claim for OIDC compatibility"
requirements-completed: [LOGGING-01, LOGGING-02]
duration: "5 min"
completed: "2026-05-19"
---

# Phase 23 Plan 01: Configure Logging (Serilog) Summary

Add production-quality Serilog sinks with environment-specific formatting and runtime enrichers. Production gets async-wrapped JSON file logs with daily rotation; development keeps human-readable console output at Debug level. Every log event includes Environment, MachineName, Application, and UserId (when authenticated).

## Tasks Completed

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Add Serilog packages to csproj | Done | 7b6b847 |
| 2 | Add rolling file sink + format to appsettings.json | Done | a09c465 |
| 3 | Verify Development config (Console + Debug) | Done | 1fcff81 |
| 4 | Create UserIdEnricher middleware | Done | 8ebdc56 |
| 5 | Wire enrichers in Program.cs | Done | 6ba0204 |

## Verification Results

- `dotnet build -c Release` — **PASSED** (0 errors, pre-existing warnings only)
- Csproj contains Serilog.Sinks.File, Serilog.Formatting.Compact, Serilog.Enrichers.Environment, Serilog.Sinks.Async — **PASSED**
- appsettings.json has File sink with daily rolling, 30-day retention, 100MB max, CompactJsonFormatter, Microsoft:Warning override — **PASSED**
- appsettings.Development.json has Console sink with Debug minimum level — **PASSED**
- UserIdEnricher.cs exists and pushes "UserId" to LogContext — **PASSED**
- Program.cs has WithEnvironmentName, WithMachineName, WithProperty("Application"), RedactingEnricher, UserIdEnricher middleware — **PASSED**

## Self-Check: PASSED

## Next

Phase 23 has 1 plan — this plan is complete. Ready for verification with `/gsd-verify-work 23`.
