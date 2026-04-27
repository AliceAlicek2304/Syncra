# Syncra Backend API Documentation

> **Purpose**: This documentation helps frontend developers understand how to start the backend, understand the API structure, and see how APIs map to frontend pages.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Starting the Backend](#starting-the-backend)
3. [Ngrok Setup for OAuth](#ngrok-setup-for-oauth)
4. [Architecture Overview](#architecture-overview)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [API to Frontend Page Mapping](#api-to-frontend-page-mapping)
7. [Authentication](#authentication)
8. [Configuration](#configuration)
9. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Prerequisites

Before starting the backend, ensure you have:

- **.NET 8.0 SDK** or later
- **Docker Desktop** (for PostgreSQL and Redis)
- **PostgreSQL 15** (or use Docker)
- **Redis 7** (or use Docker)
- **ngrok** (for OAuth callback URLs during local development)

---

## Starting the Backend

### Step 1: Start Infrastructure Services

The backend requires PostgreSQL and Redis. Use Docker Compose:

```bash
# Navigate to project root
cd D:\ky-7\EXE101\Syncra

# Start PostgreSQL and Redis containers
docker-compose up -d
```

This will start:
- **PostgreSQL** on port `5432` (database: `syncra_dev`, user: `postgres`, password: `1234567890`)
- **Redis** on port `6379`

### Step 2: Apply Database Migrations

```bash
# Navigate to the API project
cd be/src/Syncra.Api

# Apply migrations (using dotnet CLI)
dotnet ef database update
```

Or let the application apply migrations automatically on first run.

### Step 3: Run the Backend

```bash
# From the Syncra.Api directory
dotnet run
```

The API will start on:
- **HTTP**: `http://localhost:5260`
- **Swagger UI**: `http://localhost:5260/swagger`
- **Health Check**: `http://localhost:5260/health`
- **Hangfire Dashboard** (dev only): `http://localhost:5260/hangfire`

---

## Ngrok Setup for OAuth

**⚠️ IMPORTANT: Ngrok is REQUIRED for OAuth integrations to work during local development!**

OAuth providers (X/Twitter, TikTok, YouTube, Facebook) require a **public callback URL** to complete their OAuth flow. Since you're developing locally, you need ngrok to expose your local server to the internet.

### Step 1: Start Ngrok

After starting the backend, open a **new terminal** and run:

```bash
# Replace 5260 with your actual dotnet run port
ngrok http 5260
```

Ngrok will give you a public URL like:
```
https://abc123def456.ngrok-free.dev
```

### Step 2: Update Backend Configuration

Copy your ngrok URL and update `appsettings.Development.json`:

```json
"OAuth": {
  "X": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "CallbackUrl": "https://your-ngrok-url.ngrok-free.dev/api/v1/integrations/x/callback",
    "IsEnabled": true
  },
  "TikTok": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "CallbackUrl": "https://your-ngrok-url.ngrok-free.dev/api/v1/integrations/tiktok/callback",
    "IsEnabled": true
  },
  "YouTube": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "CallbackUrl": "https://your-ngrok-url.ngrok-free.dev/api/v1/integrations/youtube/callback",
    "IsEnabled": true
  },
  "Facebook": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret",
    "CallbackUrl": "https://your-ngrok-url.ngrok-free.dev/api/v1/integrations/facebook/callback",
    "IsEnabled": true
  }
}
```

### Step 3: Update OAuth Provider Developer Portal Settings

For each platform, you must set the callback/redirect URL in their developer portal to match your ngrok URL:

| Platform | Developer Portal | Setting Name |
|----------|------------------|--------------|
| **X (Twitter)** | https://developer.twitter.com | OAuth Redirect URI |
| **TikTok** | https://developers.tiktok.com | OAuth Redirect URL |
| **YouTube** | https://console.cloud.google.com | Authorized redirect URIs |
| **Facebook** | https://developers.facebook.com | Valid OAuth Redirect URIs |

Example for X/Twitter:
```
Redirect URI: https://abc123def456.ngrok-free.dev/api/v1/integrations/x/callback
```

Example for TikTok:
```
Redirect URL: https://abc123def456.ngrok-free.dev/api/v1/integrations/tiktok/callback
```

Example for YouTube:
```
Authorized redirect URIs: https://abc123def456.ngrok-free.dev/api/v1/integrations/youtube/callback
```

Example for Facebook:
```
Valid OAuth Redirect URIs: https://abc123def456.ngrok-free.dev/api/v1/integrations/facebook/callback
```

### Step 4: Restart Backend

After updating the callback URLs in `appsettings.Development.json`, restart the backend:

```bash
# Stop the current dotnet run (Ctrl+C)
# Then run again
dotnet run
```

### Important Notes

1. **Ngrok URL changes on restart**: Every time you restart ngrok, you get a new URL. You must update:
   - `appsettings.Development.json`
   - All OAuth provider developer portal settings

2. **Keep ngrok running**: While testing OAuth flows, keep ngrok running. If you stop and restart ngrok, the old callback URL will no longer work.

3. **HTTP vs HTTPS**: ngrok provides HTTPS by default. The callback URL must use `https://` not `http://`.

---

## Architecture Overview

### Project Structure

```
be/src/
├── Syncra.Api/           # Web API layer
│   ├── Controllers/      # API endpoints
│   ├── Middleware/       # Custom middleware
│   ├── Filters/          # Action filters
│   └── Program.cs        # Application entry point
├── Syncra.Application/   # Application services & DTOs
│   ├── DTOs/             # Data Transfer Objects
│   ├── Interfaces/       # Service interfaces
│   ├── Services/         # Business logic
│   └── Features/         # MediatR commands/queries
├── Syncra.Domain/        # Domain entities & enums
├── Syncra.Infrastructure/ # Data access & external services
│   ├── Persistence/      # EF Core DbContext
│   ├── Repositories/    # Data repositories
│   ├── Services/        # External integrations
│   ├── Social/          # OAuth providers
│   └── Jobs/            # Hangfire background jobs
└── tests/               # Unit tests
```

### Technology Stack

- **Framework**: ASP.NET Core 8.0
- **Database**: PostgreSQL with Entity Framework Core
- **Cache**: Redis
- **Authentication**: JWT Bearer tokens
- **Background Jobs**: Hangfire
- **Payments**: Stripe
- **Logging**: Serilog + Sentry

---

## API Endpoints Reference

### Base URL

```
http://localhost:5260/api/v1
```

### Authentication Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | Login Page |
| POST | `/auth/login` | User login | Login Page |
| POST | `/auth/refresh` | Refresh access token | Auto (axios interceptor) |
| GET | `/auth/me` | Get current user info | App Layout |

**Request/Response Examples:**

```typescript
// POST /auth/register
// Request:
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

// POST /auth/login
// Request:
{
  "email": "user@example.com",
  "password": "password123"
}
// Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "dGhpcyBpcy...",
  "expiresAtUtc": "2026-03-15T10:30:00Z"
}
```

---

### User Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get user profile | Settings Page |

---

### Workspace Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| POST | `/workspaces` | Create new workspace | Onboarding |
| GET | `/workspaces` | List user's workspaces | App Layout (switcher) |

**Request Example:**
```typescript
// POST /workspaces
{
  "name": "My Workspace"
}
```

---

### Post/Content Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| POST | `/workspaces/{workspaceId}/posts` | Create new post/idea | Ideas Page, Calendar Page |
| GET | `/workspaces/{workspaceId}/posts` | List posts with filters | Ideas Page, Calendar Page |
| GET | `/workspaces/{workspaceId}/posts/{postId}` | Get single post | Edit Post Modal |
| PUT | `/workspaces/{workspaceId}/posts/{postId}` | Update post | Edit Post Modal |
| DELETE | `/workspaces/{workspaceId}/posts/{postId}` | Delete post | Ideas Page |
| POST | `/workspaces/{workspaceId}/posts/{postId}/publish` | Publish a post | Calendar Page |

**Query Parameters for GET /posts:**
- `status`: Filter by status (draft, scheduled, published)
- `scheduledFromUtc`: Filter posts scheduled after this date
- `scheduledToUtc`: Filter posts scheduled before this date
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 20)

---

### Integration/Social Account Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| POST | `/workspaces/{workspaceId}/integrations/{providerId}/connect` | Start OAuth flow | Settings Page |
| GET | `/workspaces/{workspaceId}/integrations/{providerId}/callback` | OAuth callback | (Automatic) |
| GET | `/workspaces/{workspaceId}/integrations` | List connected integrations | Settings Page |
| DELETE | `/workspaces/{workspaceId}/integrations/{providerId}` | Disconnect integration | Settings Page |
| GET | `/workspaces/{workspaceId}/integrations/{providerId}/health` | Check integration status | Settings Page |

#### Integration Health Statuses

When calling `GET /workspaces/{workspaceId}/integrations/{providerId}/health`, the response contains a `status` field. These statuses indicate the operational state of the connection:

| Status | Meaning | Operational Impact |
|--------|---------|-------------------|
| `ok` | Connection is healthy. | All features available. |
| `warning` | Minor issue detected (e.g., nearing rate limit). | Features available but may be slow. |
| `token_expired` | Access token has expired. | Background refresh will be attempted. |
| `needs_reauth` | Connection broken; user must reconnect. | Posting and Analytics are **blocked**. |
| `error` | Critical platform error or API downtime. | Features temporarily unavailable. |
| `disconnected` | User has explicitly disconnected. | No features available. |

**Precedence Ordering:**
When multiple health checks are performed, the most severe status is reported according to this order (highest severity first):
1. `disconnected`
2. `error`
3. `needs_reauth`
4. `token_expired`
5. `warning`
6. `ok`

**Supported Providers:**
- `x` - Twitter/X
- `tiktok` - TikTok
- `youtube` - YouTube
- `facebook` - Facebook

---

### Analytics Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| GET | `/workspaces/{workspaceId}/analytics/overview` | Get overall analytics | Analytics Page |
| GET | `/workspaces/{workspaceId}/analytics/platforms` | Get platform-specific analytics | Analytics Page |
| GET | `/workspaces/{workspaceId}/analytics/{integrationId}` | Get analytics for specific integration | Analytics Page |
| GET | `/workspaces/{workspaceId}/analytics/post/{postId}` | Get analytics for specific post | Analytics Page |

**Query Parameters:**
- `date`: Number of days to look back (default: 30)
- `fromUtc`: Start date (ISO 8601)
- `toUtc`: End date (ISO 8601)

---

### Media Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| POST | `/workspaces/{workspaceId}/media/upload` | Upload media file | Create Post Modal |
| GET | `/workspaces/{workspaceId}/media` | List workspace media | Media Library |
| DELETE | `/workspaces/{workspaceId}/media/{mediaId}` | Delete media | Media Library |

---

### Subscription/Billing Endpoints

| Method | Endpoint | Description | Frontend Page |
|--------|----------|-------------|---------------|
| GET | `/workspaces/{workspaceId}/subscription` | Get current subscription | Settings Page (Billing) |
| POST | `/workspaces/{workspaceId}/subscription/create-checkout-session` | Create Stripe checkout | Settings Page (Billing) |
| POST | `/workspaces/{workspaceId}/subscription/create-portal-session` | Create billing portal session | Settings Page (Billing) |

**Webhook Endpoint (no authentication):**
- POST `/api/stripe/webhook` - Stripe webhook handler

---

## API to Frontend Page Mapping

### Login/Register Page (`/login`, `/register`)

**Used APIs:**
- `POST /api/v1/auth/register` - Create new account
- `POST /api/v1/auth/login` - Authenticate user

**Flow:**
1. User enters email/password
2. Frontend calls `/auth/login`
3. Backend returns JWT access token + refresh token
4. Frontend stores tokens in localStorage
5. Redirect to Dashboard

---

### Dashboard Page (`/app/dashboard`)

**Used APIs:**
- `GET /api/v1/workspaces/{workspaceId}/posts` - Recent posts
- `GET /api/v1/workspaces/{workspaceId}/analytics/overview` - Quick stats
- `GET /api/v1/workspaces/{workspaceId}/analytics/platforms` - Platform stats

**Display:**
- Quick stats cards (total reach, engagement, platforms connected, scheduled posts)
- Recent posts table with status, reach, and scheduled time
- AI-powered tips/suggestions

---

### Calendar Page (`/app/calendar`)

**Used APIs:**
- `GET /api/v1/workspaces/{workspaceId}/posts` - All posts with filters
- `POST /api/v1/workspaces/{workspaceId}/posts` - Create new post
- `PUT /api/v1/workspaces/{workspaceId}/posts/{postId}` - Update post (reschedule)
- `POST /api/v1/workspaces/{workspaceId}/posts/{postId}/publish` - Publish post

**Features:**
- Month/Week/Day view toggle
- Drag-and-drop rescheduling
- Platform filtering
- Post status indicators (draft, scheduled, published)

---

### Ideas Page (`/app/ideas`)

**Used APIs:**
- `GET /api/v1/workspaces/{workspaceId}/posts` - List all posts
- `POST /api/v1/workspaces/{workspaceId}/posts` - Create new idea
- `PUT /api/v1/workspaces/{workspaceId}/posts/{postId}` - Update idea
- `DELETE /api/v1/workspaces/{workspaceId}/posts/{postId}` - Delete idea

**Features:**
- Kanban-style board with columns (Unassigned, To Do, In Progress, Done)
- Drag-and-drop between columns
- AI idea generation modal
- Edit idea modal

---

### Analytics Page (`/app/analytics`)

**Used APIs:**
- `GET /api/v1/workspaces/{workspaceId}/analytics/overview` - Overall stats
- `GET /api/v1/workspaces/{workspaceId}/analytics/platforms` - Platform breakdown
- `GET /api/v1/workspaces/{workspaceId}/analytics/{integrationId}` - Integration-specific
- `GET /api/v1/workspaces/{workspaceId}/analytics/post/{postId}` - Post-specific

**Display:**
- Total reach, engagement rate, follower growth, total posts
- Weekly reach chart
- Platform performance table
- Best posting time heatmap
- AI-generated insights

---

### Settings Page (`/app/settings`)

**Used APIs:**
- `GET /api/v1/users/me` - Get user profile
- `GET /api/v1/workspaces/{workspaceId}/integrations` - List integrations
- `POST /api/v1/workspaces/{workspaceId}/integrations/{providerId}/connect` - Connect platform
- `DELETE /api/v1/workspaces/{workspaceId}/integrations/{providerId}` - Disconnect platform
- `GET /api/v1/workspaces/{workspaceId}/integrations/{providerId}/health` - Check connection health
- `GET /api/v1/workspaces/{workspaceId}/subscription` - Get subscription info
- `POST /api/v1/workspaces/{workspaceId}/subscription/create-checkout-session` - Upgrade plan
- `POST /api/v1/workspaces/{workspaceId}/subscription/create-portal-session` - Manage billing

**Features:**
- Brand voice radar (sliders)
- Connected social accounts management
- Subscription/billing management

---

### Repurpose Page (`/app/repurpose`)

**Note:** Currently uses frontend-only AI processing. Future API integration planned.

---

### Trend Radar Page (`/app/trends`)

**Note:** Currently uses frontend mock data. Future API integration planned.

---

### Help Page (`/app/help`)

**Note:** Currently uses frontend-only content. No backend API required.

---

## Authentication

### Token Flow

1. **Login** → Receive `accessToken` (JWT) + `refreshToken`
2. **Store** → Save both tokens in localStorage
3. **API Calls** → Include `Authorization: Bearer {accessToken}` header
4. **Token Expiry** → On 401, use refresh token to get new access token
5. **Refresh Fail** → Redirect to login

### Axios Interceptor (from fe/src/api/axios.ts)

The frontend automatically:
- Adds JWT token to every request
- Handles 401 responses
- Refreshes token automatically
- Queues requests during refresh

### Required Scopes

- `workspaceId` must be included in API path for workspace-scoped endpoints
- Some endpoints require `X-Workspace-Id` header (check API docs)

---

## Configuration

### Frontend Configuration

Update your frontend's API base URL in `fe/src/api/axios.ts`:

```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5260/api/v1';
```

### Backend Configuration (appsettings.Development.json)

```json
{
  "Postgres": {
    "Host": "localhost",
    "Port": 5432,
    "Database": "syncra_dev",
    "Username": "postgres",
    "Password": "1234567890"
  },
  "Redis": {
    "Host": "localhost",
    "Port": 6379
  },
  "Jwt": {
    "Secret": "your-secret-key",
    "Issuer": "Syncra",
    "Audience": "Syncra",
    "ExpirationMinutes": 60,
    "RefreshTokenExpirationDays": 7
  },
  "Stripe": {
    "SecretKey": "sk_test_...",
    "WebhookSecret": "whsec_..."
  },
  "OAuth": {
    "X": { "ClientId": "...", "ClientSecret": "...", "CallbackUrl": "..." },
    "TikTok": { "ClientId": "...", "ClientSecret": "...", "CallbackUrl": "..." },
    "YouTube": { "ClientId": "...", "ClientSecret": "...", "CallbackUrl": "..." },
    "Facebook": { "ClientId": "...", "ClientSecret": "...", "CallbackUrl": "..." }
  }
}
```

---

## Common Issues & Troubleshooting

### Database Connection Failed

**Error:** `NpgsqlException: connection refused`

**Solution:**
```bash
# Verify PostgreSQL is running
docker ps

# Check logs
docker logs syncra-postgres
```

### Migration Failed

**Error:** `InvalidOperationException: No database provider configured`

**Solution:**
```bash
cd be/src/Syncra.Api
dotnet ef database update --verbose
```

### JWT Token Validation Failed

**Error:** `IDX10500: Signature validation failed`

**Solution:**
- Ensure `Jwt:Secret` in appsettings.json matches across all environments
- Clear browser localStorage and re-login

### CORS Errors

**Solution:** Ensure frontend base URL matches allowed origins in `Program.cs`:

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000");
    });
});
```

### OAuth Callback Not Working

**Error:** OAuth flow fails or doesn't redirect back

**Solution:**
1. **Ensure ngrok is running** - OAuth requires a public URL
2. **Verify callback URLs match** - Check both `appsettings.Development.json` AND the OAuth provider portal
3. **Ngrok URL changed?** - If you restarted ngrok, you need to update both places again
4. **Check HTTPS** - Callback URLs must use `https://` not `http://`
5. **Check X-Forwarded-Proto** - The backend should trust the ngrok proxy

### Redis Connection Failed

**Error:** `RedisConnectionException: Could not connect to ...`

**Solution:**
```bash
# Verify Redis is running
docker ps

# Test connection
redis-cli -h localhost -p 6379
```

---

## API Documentation Auto-Generated

For detailed endpoint specifications, request/response schemas, and try-it-out functionality:

**Open Swagger UI**: `http://localhost:5260/swagger`

The Swagger documentation includes:
- All endpoint descriptions
- Request/response schemas
- Example values
- Try-it-out functionality

---

## Need Help?

- **Frontend Issues**: Check `fe/src/api/axios.ts` for API configuration
- **Backend Issues**: Check `be/src/Syncra.Api/Program.cs` for service registration
- **Database Issues**: Verify PostgreSQL is running and migrations are applied
- **OAuth Issues**: 
  - Verify ngrok is running
  - Check callback URLs in both `appsettings.Development.json` AND OAuth provider portal
  - Remember: ngrok URLs change on restart!

---

*Last Updated: March 2026*
*For questions, contact: support@syncra.io*