# Repurpose Engine Real-AI Requirements (Text Input Only)

## In scope
- Only the `Dan van ban` flow (paste text input).
- User clicks `Start Repurpose Engine`.
- System builds one general LLM prompt using:
  - selected platforms
  - selected tone
  - selected length
  - source text content
- LLM returns JSON that matches `RepurposeAtom` shape.
- Frontend parses JSON and renders cards.
- Platform tabs are dynamic: `All` + selected platforms only.
- Export interaction updates:
  - rename button from `Xuat tat ca` to `Xuat file`
  - clicking `Xuat file` enables selection mode
  - each card shows checkbox at top-right
  - clicking anywhere on a card toggles selected state
  - show `Xuat tat ca` button on the left of `Xuat file`
  - show selected counter

## Out of scope
- `Tu URL` flow
- `Tai file len` flow
- broad visual redesign
- unrelated backend refactors

## Prompt behavior requirements
- A single general prompt template supports all selected platforms.
- Output count must be 2 to 3 posts.
- Prompt explicitly requests strict JSON only.
- Prompt instructs model to use selected tone and selected length.

## JSON contract requirements
Each item must match:
- `id: string`
- `type: 'POST' | 'THREAD' | 'CAROUSEL' | 'INSIGHT' | 'TIP' | 'QUOTE'`
- `title?: string`
- `content: string`
- `platform: 'LinkedIn' | 'X' | 'Instagram' | 'Newsletter'`
- `suggestedHashtags: string[]`
- `suggestedCTA?: string`

Validation:
- minimum 2 items, maximum 3 items
- all item platforms must be in selected platforms
- each item must have non-empty content

## Workflow
1. User pastes text.
2. User clicks `Start Repurpose Engine`.
3. Build LLM prompt from selections + source text.
4. Call generation endpoint/service.
5. Parse and validate JSON.
6. Render cards.
7. Show dynamic tabs.
8. Support export selection mode.
