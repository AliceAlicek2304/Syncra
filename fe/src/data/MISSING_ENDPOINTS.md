# Missing Backend Endpoints (Discovered During Phase 14)

## Coach Trends
- **File:** `fe/src/data/mockCoachTrends.ts` (DELETED)
- **Consumer:** `AICoach.tsx` — carousel shows fallback placeholder
- **Blocking:** Personalized trend tips and AI coaching recommendations
- **Verification:** No `GET /workspaces/{id}/coach/trends` endpoint exists
- **Recommendation:** Create backend endpoint returning trend data, then replace fallback in AICoach.tsx

## Repurpose Engine
- **File:** `fe/src/data/mockAI.ts` — `mockGenerateRepurpose` function (DELETED)
- **Consumer:** RepurposeContext (types only, no runtime mock data used currently)
- **Blocking:** Automated content repurposing across platforms
- **Verification:** No `POST /workspaces/{id}/repurpose/generate` endpoint exists
- **Recommendation:** Create backend endpoint for content repurposing, then restore the repurpose flow

## Per-Platform Analytics
- **File:** `fe/src/pages/app/AnalyticsPage.tsx` — `PLATFORMS_DATA` (REMOVED)
- **Blocking:** Per-platform breakdown (reach, engagement, growth per platform)
- **Recommendation:** Create per-platform analytics endpoint
