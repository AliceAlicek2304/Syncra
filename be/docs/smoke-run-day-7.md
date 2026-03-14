# Day 7 Smoke Run Guide

## Overview
This document provides step-by-step instructions for conducting a successful smoke run of the Syncra backend on Day 7. The smoke run validates core functionality across authentication, integrations, post management, and billing flows.

## Prerequisites

### Local Environment Setup
1. **Database**: PostgreSQL running locally or accessible via connection string
2. **Redis**: Redis instance for caching (optional but recommended)
3. **Envionment Variables**:r Configure `.env` or `appsettings.Development.json` with:
   - Database connection string
   - JWT secret and issuer/audience
   - Stripe API keys (sandbox/test mode)
   - Social provider OAuth credentials (X/Twitter, TikTok, YouTube)
   - Hangfire dashboard credentials

### Pre-Flight Checks
```bash
# 1. Verify database is accessible
dotnet ef database update --project be/src/Syncra.Infrastructure --startup-project be/src/Syncra.Api

# 2. Build the solution
dotnet build be

# 3. Run the API
dotnet run --project be/src/Syncra.Api
```

Expected output: API starts on `https://localhost:5001` (or configured port)

## Test Cases

### 1. Authentication Flow

#### Register a New User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "User",
  "lastName": "Test"
}
```

**Expected**: `201 Created` with success message

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Expected**: `200 OK` with JWT token and refresh token

#### Get Current User
```bash
GET /api/v1/auth/me
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with user details

#### Refresh Token
```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refresh_token}"
}
```

**Expected**: `200 OK` with new JWT and refresh token

### 2. Integration Flow

#### Connect to Social Provider
```bash
POST /api/v1/workspaces/{workspaceId}/integrations/x/connect?redirectUri=http://localhost:5001/api/v1/workspaces/{workspaceId}/integrations/x/callback
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with authorization URL

**Manual Step**: Open the URL in a browser, authorize the app, and verify callback succeeds

#### List Integrations
```bash
GET /api/v1/workspaces/{workspaceId}/integrations
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with list of active integrations

#### Disconnect Integration
```bash
DELETE /api/v1/workspaces/{workspaceId}/integrations/x
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with success message

### 3. Post Management Flow

#### Create a Post
```bash
POST /api/v1/workspaces/{workspaceId}/posts
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "content": "Test post content",
  "platforms": ["x"],
  "scheduledForUtc": "2026-03-15T10:00:00Z"
}
```

**Expected**: `201 Created` with post details

#### Get Posts
```bash
GET /api/v1/workspaces/{workspaceId}/posts?status=scheduled&page=1&pageSize=20
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with paginated post list

#### Update a Post
```bash
PUT /api/v1/workspaces/{workspaceId}/posts/{postId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "content": "Updated post content",
  "scheduledForUtc": "2026-03-15T11:00:00Z"
}
```

**Expected**: `200 OK` with updated post details

#### Publish a Post (Dry Run)
```bash
POST /api/v1/workspaces/{workspaceId}/posts/{postId}/publish
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "dryRun": true
}
```

**Expected**: `200 OK` with dry run results

#### Delete a Post
```bash
DELETE /api/v1/workspaces/{workspaceId}/posts/{postId}
Authorization: Bearer {jwt_token}
```

**Expected**: `204 No Content`

### 4. Billing Flow (Stripe Sandbox)

#### Get Current Subscription
```bash
GET /api/v1/workspaces/{workspaceId}/subscription
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with subscription details (or null if no subscription)

#### Create Subscription Checkout
```bash
POST /api/v1/workspaces/{workspaceId}/subscription/checkout
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "priceId": "price_test_123",
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel"
}
```

**Expected**: `200 OK` with Stripe checkout URL

**Manual Step**: Complete checkout in Stripe test mode

#### Cancel Subscription
```bash
POST /api/v1/workspaces/{workspaceId}/subscription/cancel
Authorization: Bearer {jwt_token}
```

**Expected**: `200 OK` with cancellation confirmation

#### Stripe Webhook (Simulate)
Use Stripe CLI to forward webhook events:
```bash
stripe listen --forward-to localhost:5001/api/v1/webhooks/stripe
stripe trigger checkout.session.completed
```

**Expected**: Webhook processed successfully, subscription state updated

## Common Troubleshooting

### Issue: Database Connection Fails
- **Check**: Connection string in `appsettings.Development.json`
- **Fix**: Ensure PostgreSQL is running and credentials are correct
- **Verify**: `psql -U {username} -d {database}` connects successfully

### Issue: JWT Token Invalid
- **Check**: Token expiration and JWT secret configuration
- **Fix**: Ensure `JwtOptions` in `appsettings.json` matches token generation
- **Verify**: Decode token at jwt.io to inspect claims

### Issue: OAuth Callback Fails
- **Check**: Redirect URI matches exactly (including protocol and port)
- **Fix**: Update provider app settings with correct callback URL
- **Verify**: Check provider dashboard for registered redirect URIs

### Issue: Stripe Webhook Signature Verification Fails
- **Check**: Webhook signing secret in environment variables
- **Fix**: Copy signing secret from Stripe dashboard or CLI output
- **Verify**: `stripe listen` shows events being forwarded

### Issue: Scheduled Posts Not Publishing
- **Check**: Hangfire dashboard at `/hangfire` for job status
- **Fix**: Ensure Hangfire is configured and recurring jobs are registered
- **Verify**: Check logs for `DuePostPublishJob` execution

### Issue: Transient HTTP Failures
- **Check**: Polly retry policies are applied (check logs for retry attempts)
- **Fix**: Verify external service availability (X API, TikTok API, etc.)
- **Verify**: Logs show exponential backoff retry pattern

## Success Criteria

✅ All authentication endpoints return expected responses  
✅ OAuth flow completes successfully for at least one provider  
✅ Posts can be created, updated, and deleted  
✅ Dry run publish validates integration connectivity  
✅ Stripe checkout and webhook processing work in sandbox mode  
✅ No unhandled exceptions in logs  
✅ Validation errors return meaningful 400 responses  
✅ Retry policies handle transient failures gracefully  

## Next Steps

After successful smoke run:
1. Document any issues or edge cases discovered
2. Update integration tests to cover smoke run scenarios
3. Prepare for production deployment checklist
4. Review observability setup (logs, metrics, error tracking)
