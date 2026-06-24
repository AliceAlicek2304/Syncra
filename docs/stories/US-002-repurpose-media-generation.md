# US-002 Repurpose Media Generation

## Status

implemented

## Lane

normal

## Product Contract

Users can generate media files (images or videos) from the sources added to the Repurpose engine.
- Images must be generated using `gemini-3.1-flash-image`.
- Short videos must be generated using `veo-3.1-lite-generate-preview`.
- When media generation is active, target platform selection is restricted to at most 1 platform.
- Available media types adapt to platform capabilities (YouTube supports video only; Google Business Profile supports image only; others support both).

## Relevant Product Docs

- `docs/product/repurpose_from_existing.md`

## Acceptance Criteria

- [x] "Tạo Media" toggle added to AI Settings on the Repurpose page.
- [x] Toggling media generation restricts target platforms to 1.
- [x] Media options (Image/Video) dynamically adapt to platform capabilities (YouTube video-only, Google Business image-only, others both).
- [x] Model parameters `gemini-3.1-flash-image` (Image) and `veo-3.1-lite-generate-preview` (Video) are sent to the backend.
- [x] Backend generates assets via Gemini SDK, saves files to `wwwroot/uploads/` and returns public path.
- [x] Backend falls back to robust mock assets if GenAI API keys fail or lack quota.
- [x] Frontend displays the image or video preview inside the resulting card.

## Design Notes

- **API Request**: Update `RepurposeGenerateRequest` DTO and `RepurposeRequest` to include `GenerateMedia` (bool) and `MediaType` (string).
- **API Response**: Update `RepurposeAtom` DTO to include `MediaUrl` (string) and `MediaType` (string).
- **Database**: Add `MediaUrl` and `MediaType` to `repurpose_atoms` table via migration.
- **Service**: Update `AIRepurposeService` and `GeminiProvider` to handle image and video generation using client SDK methods.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `dotnet test src/Syncra.UnitTests` passes |
| Integration | Backend builds and runs successfully |
| E2E | Frontend compiles and functions correctly in browser |

## Harness Delta

None.

## Evidence

None.
