# Phase 5 Context: Stripe Data Consistency & Mapping

## Domain
Reconciling and mapping local `Plan` and `Subscription` entities with Stripe's Product, Price, and Subscription data to ensure consistency.

## Canonical refs
- `be/.planning/ROADMAP.md`
- `be/.planning/REQUIREMENTS.md`
- `be/src/Syncra.Domain/Entities/Plan.cs`
- `be/src/Syncra.Domain/Entities/Subscription.cs`
- `be/src/Syncra.Api/Controllers/StripeWebhookController.cs`

## Decisions Captured

### Plan Mapping Strategy
- **Source of Truth:** Stripe is the source of truth for Plans. The local database will sync plans from Stripe dynamically.
- **Sync Mechanism:** Webhooks + Manual Seed. Provide an admin endpoint or CLI command to trigger an initial baseline sync. Ongoing updates will be handled strictly via Stripe webhooks (`product.*` and `price.*`).
- **Feature Mapping:** Local Configuration Overlay. The local database will sync the base plan details (name, ID, Price) from Stripe. Application-specific feature limits (e.g., max users, max scheduled posts) will remain defined in local code or `appsettings.json` and will be joined via the Stripe identifier.

## Code Context
- Use existing `StripeWebhookController` (from Phase 4) for expanding `product.*` and `price.*` webhook handling.
- `Plan` entity may need modifications to cleanly separate synced Stripe data from local overlay config.
