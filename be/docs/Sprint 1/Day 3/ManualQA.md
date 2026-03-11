# Manual QA: Day 3 Social Integration

This document outlines the steps to verify the local OAuth flows for X (Twitter) and TikTok.

## Prerequisites
1. **ngrok:** You must have `ngrok` running to expose your local environment. Social providers require HTTPS callback URLs.
   ```bash
   ngrok http 5000 # or whatever port the API is running on
   ```
2. **Provider Dashboard Configurations:**
   Ensure both X and TikTok Developer Portals have the `ngrok` URL added to their allowed Redirect URIs list.
   - Example expected format: `https://<your-ngrok-id>.ngrok.io/api/v1/workspaces/{workspaceId}/integrations/{providerId}/callback`

## Testing the OAuth Connect Flow
1. **Initialize Connect:**
   - Make a `GET` request to `/api/v1/workspaces/{workspaceId}/integrations/{providerId}/connect`.
   - Provide `Authorization: Bearer <token>` and `X-Workspace-Id: <workspaceId>`.
   - Observe the 302 Redirect, or copy the `url` from the JSON response if the client prevents auto-redirects.

2. **Authenticate with Provider:**
   - Open the provider authentication URL in a browser.
   - You should see the permission consent screen.
   - Approve the permissions.

3. **Callback Handling:**
   - The provider will redirect you back to the callback URL (your ngrok URL).
   - This hits `/api/v1/workspaces/{workspaceId}/integrations/{providerId}/callback`.
   - The API will exchange the code for access/refresh tokens using the `ISocialProvider` implementation.
   - The integration credentials and user metadata will be persisted to the `integrations` table for that workspace.

## Verifying Persistence
- Log into your local PostgreSQL instance:
  ```sql
  SELECT * FROM integrations WHERE workspace_id = '{workspaceId}';
  ```
- Ensure the row contains the correctly populated `access_token`, `refresh_token`, `expires_at_utc`, and `metadata` (JSONb). Note that the access token might be encrypted if field-level encryption is enabled later.

## Testing Disconnect
- Make a `DELETE` request to `/api/v1/workspaces/{workspaceId}/integrations/{providerId}`.
- Verify that the `integration` row is marked as `is_active = false` or permanently removed in the DB.
