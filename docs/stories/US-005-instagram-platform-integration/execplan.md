# Exec Plan

## Goal

Provide full Instagram integration via Zernio SDK/API. Enable creators to connect Instagram accounts, select them in the composer, set Instagram-specific publishing options, publish immediately or schedule, and manage them via Inbox/Comments/Analytics.

## Scope

In scope:
- Updating backend `InstagramPlatformDataDto` and `ZernioClient.cs` to map new Instagram settings fields (`publishAs`, `locationId`, `altText`).
- Enabling Instagram connection in the frontend `ConnectionsPage.tsx`.
- Enabling Instagram in the frontend post composer types (`fe/src/components/create-post/types.ts`) and state (`useCreatePostState.ts`).
- Enhancing `InstagramForm` in `PlatformSpecificForm.tsx` to handle the new fields.

Out of scope:
- Instagram personal account support (requires direct Meta API or unsupported by Zernio).
- Liking comments or DM reactions in Inbox.

## Risk Classification

Risk flags:
- External systems (Zernio SDK)
- Public contracts (new post settings DTOs)
- Cross-platform / Multi-domain (both backend and frontend)
- Existing behavior (composer state, connections UI)

Hard gates:
- External provider behavior.

## Work Phases

1. **Discovery**: Inspect existing platform patterns (Reddit, TikTok, Facebook). Completed.
2. **Design**: Establish mapping from `publishAs` to Zernio's `contentType` field. Completed.
3. **Validation planning**: Define test cases for E2E flows (mocking Instagram endpoints).
4. **Implementation**: Modify C# backend DTOs, `ZernioClient.cs`, and frontend TypeScript type definitions, state variables, and settings forms.
5. **Verification**: Compile project, run unit/integration/E2E test suite.
6. **Harness update**: Verify story using Harness CLI and record traces.

## Stop Conditions

Pause for human confirmation if:
- API response models from Zernio for Instagram change.
- Compilation errors arise due to Zernio SDK version differences.
