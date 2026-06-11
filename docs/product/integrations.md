# Syncra Social Integrations & OAuth

Syncra allows users to link third-party social media accounts (X, TikTok, YouTube, Facebook) using standard OAuth 2.0.

## OAuth Setup & Ngrok

During local development, third-party social platforms must be able to redirect back to a public callback URL. Since the backend runs locally on port `5260`, a public tunnel like **ngrok** is required.

### Local Development Flow

1. Expose the API port:
   ```bash
   ngrok http 5260
   ```
2. Copy the generated HTTPS public URL (e.g. `https://abc123def456.ngrok-free.dev`).
3. Update `appsettings.Development.json` OAuth callback configurations to match:
   ```json
   "OAuth": {
     "X": {
       "CallbackUrl": "https://abc123def456.ngrok-free.dev/api/v1/integrations/x/callback"
     }
   }
   ```
4. Set the exact redirect URI in the respective platform's Developer Portal.

## Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/workspaces/{workspaceId}/integrations/{providerId}/connect` | Retrieve authorization URL to initiate OAuth flow |
| GET | `/api/v1/integrations/{providerId}/callback` | Handles authorization redirect from the platform (public) |
| GET | `/workspaces/{workspaceId}/integrations` | List all connected integrations and health statuses |
| DELETE | `/workspaces/{workspaceId}/integrations/{providerId}` | Disconnect an integration |
| GET | `/workspaces/{workspaceId}/integrations/{providerId}/health` | Retrieve specific connection health metrics |

## Integration Health Statuses

The `GET /integrations/{providerId}/health` endpoint exposes connection details with a `status` field:

| Status | Meaning | System Action / User Experience |
|---|---|---|
| `ok` | Connection is healthy | All features active |
| `warning` | Rate limits or mild API warnings | Functional, but warnings active |
| `token_expired` | Access token expired | Background auto-refresh attempted |
| `needs_reauth` | Refresh token expired or connection revoked | Blocking publishing; prompt user to reconnect |
| `error` | Downtime on the platform side | Intermittent block; retry later |
| `disconnected` | User intentionally disconnected | No publishing possible |

### Precedence Rules

When merging statuses or resolving overall system health, severity takes precedence in this order (highest severity first):
1. `disconnected`
2. `token_expired`
3. `needs_reauth`
4. `error`
5. `warning`
6. `ok`
