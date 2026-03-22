# Multi-Chat Slice Plan 

## Slice 1: Prompt Builder + Output Schema
Goal:
- Create general prompt builder from selected platforms/tone/length/content.
- Define strict output types and validation utilities.

Allowed edit scope:
- repurpose data/service layer and related types only.

Done when:
- prompt builder exists and is unit-testable.
- parser/validator enforces 2 to 3 items and enum checks.

## Slice 2: Wire Start Engine to Real Generation (Text only)
Goal:
- Replace mock path in text flow with real generation call.
- Keep URL/file-upload flows untouched.

Allowed edit scope:
- repurpose generate trigger + service integration + repurpose context state.

Done when:
- clicking `Start Repurpose Engine` with pasted text renders AI results from validated JSON.
- failures show clear UI error.

## Slice 3: Dynamic Tabs by Selected Platforms
Goal:
- tabs = `All` + selected platforms.
- filter cards by active tab.

Allowed edit scope:
- repurpose result grid/tab UI only.

Done when:
- selected platforms LinkedIn + X produce tabs: All, LinkedIn, X.

## Slice 4: Export Selection Mode UX
Goal:
- rename `Xuat tat ca` -> `Xuat file`
- selection mode with per-card checkbox
- card click toggles selection
- show `Xuat tat ca` to the left of `Xuat file`
- show selected counter

Allowed edit scope:
- repurpose result grid + atom card + local state/context needed for selection.

Done when:
- selection mode works consistently under all tabs.

## Slice 5: Hardening and Regression Pass
Goal:
- remove dead mock paths used by real flow (if still present)
- add tests/checks for parser and UI edge cases
- final verification

Allowed edit scope:
- only files directly related to repurpose flow.

Done when:
- checks pass and manual test script in session report is green.
