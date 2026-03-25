# File Scope Cheatsheet (No Coding Knowledge Needed)

Use this to constrain Claude without knowing C# or frontend internals.

## Text Input Flow (Dan van ban)
Primary UI files:
- fe/src/components/repurpose/InputSection.tsx
- fe/src/components/repurpose/ConfigBar.tsx
- fe/src/components/repurpose/ResultsGrid.tsx
- fe/src/components/repurpose/AtomCard.tsx
- fe/src/pages/app/RepurposePage.tsx
- fe/src/context/RepurposeContext.tsx
- fe/src/context/repurposeContextBase.ts

Current mock generation/types:
- fe/src/data/mockAI.ts

Possible API utility locations (discover before edit):
- fe/src/utils/**
- fe/src/data/**

## Safe constraints you can paste to Claude
- "Only edit files under fe/src/components/repurpose and fe/src/context related to repurpose."
- "Do not modify be/ backend in this slice."
- "Do not modify URL/file-upload mode behavior in InputSection."

## Slice-to-files map
Slice 1 (prompt/schema/parser):
- mostly fe/src/data/mockAI.ts or a new repurpose service/type file under fe/src/data or fe/src/utils

Slice 2 (wire Start Engine):
- fe/src/components/repurpose/ConfigBar.tsx
- fe/src/context/RepurposeContext.tsx
- service/type file from Slice 1

Slice 3 (dynamic tabs):
- fe/src/components/repurpose/ResultsGrid.tsx
- maybe fe/src/components/repurpose/AtomCard.tsx

Slice 4 (export selection mode):
- fe/src/components/repurpose/ResultsGrid.tsx
- fe/src/components/repurpose/AtomCard.tsx
- maybe fe/src/context/RepurposeContext.tsx

## Red-zone files (avoid unless explicitly required)
- be/src/**
- routing/auth/subscription unrelated frontend files
- global styling unrelated to repurpose feature
