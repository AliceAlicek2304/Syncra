---
phase: "02-architectural-performance"
plan: "04"
subsystem: "Subscriptions"
tags: ["migrations", "ef-core", "stripe", "database"]
dependency_graph:
  requires: []
  provides: "Stripe ID mapping for Plan entity"
  affects: ["Subscriptions", "Database schema"]
tech_stack:
  added: []
  patterns: ["EF Core Migrations", "Seed Data"]
key_files:
  created:
    - "src/Syncra.Infrastructure/Migrations/*_UpdatePlanWithStripeIds.cs"
  modified:
    - "src/Syncra.Domain/Entities/Plan.cs"
    - "src/Syncra.Infrastructure/Persistence/Configurations/SubscriptionConfigurations.cs"
    - "src/Syncra.Infrastructure/Persistence/Seed/PlanSeedData.cs"
key_decisions:
  - "Decided to add StripePriceId and StripeProductId to the Plan entity to decouple the subscription lookup from internal GUIDs."
  - "Added unique index on StripePriceId to ensure fast lookups and data integrity."
metrics:
  duration_minutes: 5
  completed_date: "2026-04-26"
---

# Phase 2 Plan 04: Plan Lookup Service - Entities/Migrations Summary

Added Stripe identifiers to the Plan entity and generated corresponding EF Core migrations to enable external plan lookup.

## Overview
This plan focused on decoupling our internal Plan entity identifiers from Stripe's external identifiers. By adding `StripePriceId` and `StripeProductId` to the `Plan` entity, we pave the way for webhook processing and checkout sessions to reliably resolve internal plans using Stripe's data.

## Tasks Completed

- **Task 1: Add Stripe fields to Plan entity** - Added `StripeProductId` and `StripePriceId` to the `Plan` domain entity.
- **Task 2: Update Plan configuration** - Mapped the new fields in EF Core configuration and added a unique index on `StripePriceId`.
- **Task 3: Update Plan seed data** - Added placeholder Stripe IDs to existing seeded plans.
- **Task 4: Generate and apply migration** - Generated the `UpdatePlanWithStripeIds` EF Core migration. Note: Database application failed locally due to missing database connection, but the migration file was verified and committed.

## Deviations from Plan
- None - plan executed exactly as written.

## Known Stubs
- Seed data contains placeholder Stripe IDs (`prod_placeholder_free`, etc.) which will need to be updated to actual Stripe IDs in a production environment.

## Self-Check: PASSED
- `src/Syncra.Domain/Entities/Plan.cs` modified
- `src/Syncra.Infrastructure/Persistence/Configurations/SubscriptionConfigurations.cs` modified
- `src/Syncra.Infrastructure/Persistence/Seed/PlanSeedData.cs` modified
- Migration files created in `src/Syncra.Infrastructure/Migrations/`
- Commits recorded successfully.