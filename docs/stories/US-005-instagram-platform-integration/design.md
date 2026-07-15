# Design

## Domain Model

Syncra uses a generic platform representation where platforms are represented as strings. The `SocialAccount` and `PostPlatformTarget` entities store platforms in lower-case format (e.g., `"instagram"`). No changes are required in the core Domain layer.

## Application Flow

1. **OAuth Connection**:
   - Frontend triggers OAuth connection via `GET /api/v1/social-accounts/connect-url/instagram` to fetch Zernio's headless connect URL.
   - Upon redirect, the frontend catches parameter `platform=instagram` and calls `POST /api/v1/social-accounts/direct-connect` to save the `SocialAccount` (since Instagram is direct connect).

2. **Publishing / Scheduling**:
   - Post composer sends a `CreateZernioPostCommand` or `UpdateZernioPostCommand` carrying `InstagramPlatformDataDto`.
   - `ZernioClient.cs` maps `AllPlatformDataDto.Instagram` into the request payload.

## Interface Contract

1. **C# DTOs**:
   Update `InstagramPlatformDataDto` in `be/src/Syncra.Application/DTOs/Zernio/ZernioPlatformDataDtos.cs` to include:
   - `[property: JsonPropertyName("publishAs")] string? PublishAs = null`
   - `[property: JsonPropertyName("locationId")] string? LocationId = null`
   - `[property: JsonPropertyName("altText")] string? AltText = null`

2. **Zernio Client Mapping**:
   In `be/src/Syncra.Infrastructure/Services/ZernioClient.cs`, add mapping in `MapPlatformSpecificData` for `instagram` to support mapping `publishAs` to `contentType` ("reels" / "story"):
   ```csharp
   "instagram" => BuildSdkInstagramSettings(request)
   ```

3. **TypeScript DTOs**:
   In `fe/src/components/create-post/PlatformSpecificForm.tsx`, update `InstagramPlatformData` interface:
   - `publishAs?: 'post' | 'reel' | 'story'`
   - `locationId?: string`
   - `altText?: string`

## Data Model

No table or migration changes are needed since platforms are stored dynamically as strings in `SocialAccount.Platform` and `PostPlatformTarget.Platform`.

## UI / Platform Impact

1. **Enable Connection**:
   Update `fe/src/pages/app/ConnectionsPage.tsx` to set `isSupported: true` for `instagram`.

2. **Enable Creator Option**:
   - Update `Platform` type and `PLATFORMS` registry in `fe/src/components/create-post/types.ts`.
   - Update `useCreatePostState.ts` (captionsByPlatform, touched, validations).
   - Update `InstagramForm` in `fe/src/components/create-post/PlatformSpecificForm.tsx` to display inputs for `publishAs`, `locationId`, and `altText`.

## Observability

- Handled by Serilog and Zernio's platform logging.

## Alternatives Considered

1. **Direct API calls**: Rejected. System must use Zernio SDK/API.
2. **Page selection step**: Rejected. Instagram connects directly as a profile once linked to Facebook/Zernio.
