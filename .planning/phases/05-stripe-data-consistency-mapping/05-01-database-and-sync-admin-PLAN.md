---
plan_id: "05-01"
objective: "Refactor Plan entity and implement Stripe baseline sync"
wave: 1
depends_on: []
files_modified:
  - "src/Syncra.Domain/Entities/Plan.cs"
  - "src/Syncra.Domain/Interfaces/IPlanRepository.cs"
  - "src/Syncra.Infrastructure/Repositories/PlanRepository.cs"
  - "src/Syncra.Api/Controllers/AdminStripeSyncController.cs"
requirements_addressed: ["REQ-2.1"]
autonomous: true
---

# Plan 05-01: Refactor Plan entity and implement Stripe baseline sync

## Objective
Refactor the `Plan` entity to properly store both Monthly and Yearly Stripe Price IDs, generate EF Core migrations, and implement an Admin endpoint to perform a baseline synchronization of Plans from Stripe.

## Tasks

### 1. Refactor Plan Entity & Repository
```xml
<task>
  <read_first>
    - src/Syncra.Domain/Entities/Plan.cs
    - src/Syncra.Domain/Interfaces/IPlanRepository.cs
    - src/Syncra.Infrastructure/Repositories/PlanRepository.cs
  </read_first>
  <action>
    Modify `Plan.cs`: Replace `StripePriceId` with `StripeMonthlyPriceId` (string?) and `StripeYearlyPriceId` (string?).
    Update `IPlanRepository.cs` and `PlanRepository.cs`: Update any methods that query by StripePriceId (e.g., `GetByStripePriceIdAsync`) to instead check if either `StripeMonthlyPriceId == stripePriceId` OR `StripeYearlyPriceId == stripePriceId`.
    Update any other compile-time errors caused by renaming `StripePriceId`.
  </action>
  <acceptance_criteria>
    - `Plan.cs` contains `public string? StripeMonthlyPriceId { get; set; }` and `public string? StripeYearlyPriceId { get; set; }`
    - `Plan.cs` does NOT contain `StripePriceId`
    - `PlanRepository.cs` compiles successfully and queries against the new columns
  </acceptance_criteria>
</task>
```

### 2. Database Schema Push
```xml
<task>
  <read_first>
    - src/Syncra.Domain/Entities/Plan.cs
  </read_first>
  <action>
    [BLOCKING] Schema Push Required
    Generate an Entity Framework Core migration for the `Plan` entity changes and apply it to the database.
    Run `dotnet ef migrations add Phase05_StripePrices -p src/Syncra.Infrastructure -s src/Syncra.Api`
    Run `dotnet ef database update -p src/Syncra.Infrastructure -s src/Syncra.Api`
  </action>
  <acceptance_criteria>
    - A new migration file `*Phase05_StripePrices.cs` exists in the Migrations folder
    - `dotnet ef database update` exits with 0
  </acceptance_criteria>
</task>
```

### 3. Implement Admin Baseline Sync Endpoint
```xml
<task>
  <read_first>
    - src/Syncra.Api/Controllers/StripeWebhookController.cs
  </read_first>
  <action>
    Create `src/Syncra.Api/Controllers/AdminStripeSyncController.cs` with an endpoint `POST /api/admin/stripe/sync-plans`.
    Inject `Stripe.ProductService` and `Stripe.PriceService` (or a dedicated application service) to list active Stripe Products and Prices.
    Upsert `Plan` records:
    - Match `Plan` by `StripeProductId == product.Id`. If missing, create new.
    - Set `Name = product.Name`.
    - Find the Monthly price (interval='month') and Yearly price (interval='year') for this product.
    - Set `PriceMonthly`, `PriceYearly`, `StripeMonthlyPriceId`, and `StripeYearlyPriceId` accordingly.
    - Save changes to the database.
  </action>
  <acceptance_criteria>
    - `AdminStripeSyncController.cs` contains `POST /api/admin/stripe/sync-plans`
    - Logic fetches from Stripe SDK and calls `DbContext.SaveChangesAsync()`
    - Compiles successfully
  </acceptance_criteria>
</task>
```

## Verification
- Unit tests pass.
- Project compiles.
- EF Core migration applies cleanly.

## must_haves
truths:
  - "Stripe is the source of truth for Plans"
