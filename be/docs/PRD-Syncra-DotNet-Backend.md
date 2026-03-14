# PRD: Syncra Backend (.NET)

## 1. Executive Summary

Build a complete backend system for a social media scheduling and management platform similar to Syncra, using .NET 8+ (C#) instead of NestJS. The system will handle user authentication, post scheduling, social media integrations (30+ platforms), analytics, billing, and AI-powered content generation.

## 2. Project Overview

### 2.1 Project Name

**Syncra.NET** - Social Media Scheduling Platform Backend

### 2.2 Core Functionality

A backend API that enables users to:

- Schedule and publish posts to 30+ social media platforms
- Manage multiple social media accounts per user
- Analyze post performance and engagement
- Handle subscription/billing via Stripe
- Generate AI-powered content using OpenAI
- Manage team collaboration and permissions

### 2.3 Target Users

- Social media managers
- Marketing teams
- Agencies managing multiple clients
- Content creators

---

## 3. Technical Architecture

### 3.1 Technology Stack

| Component         | Technology                | Justification                       |
| ----------------- | ------------------------- | ----------------------------------- |
| Framework         | ASP.NET Core 8.0          | Modern, performant, cross-platform  |
| ORM               | Entity Framework Core 8.0 | Industry standard, strong typing    |
| Database          | PostgreSQL                | Complex relationships, JSON support |
| Cache             | Redis                     | Session, rate limiting, pub/sub     |
| Queue/Hangfire    | Hangfire or MassTransit   | Background job processing           |
| Authentication    | JWT + OAuth 2.0           | Stateless, industry standard        |
| API Documentation | Swagger/OpenAPI           | Auto-generated docs                 |
| Error Tracking    | Sentry                    | Application monitoring              |
| File Storage      | Cloudflare R2 / S3        | Media storage                       |

### 3.2 Project Structure (Monorepo)

```
src/
├── Syncra.Api/                    # Main API project
│   ├── Controllers/               # API endpoints
│   ├── Middleware/                # Custom middleware
│   ├── Filters/                  # Action filters
│   ├── Extensions/               # Service extensions
│   └── Program.cs
├── Syncra.Application/            # Application layer (Services)
│   ├── Services/
│   ├── Interfaces/
│   └── DTOs/
├── Syncra.Infrastructure/        # Infrastructure layer
│   ├── Persistence/              # EF Core DbContext, Repositories
│   ├── Services/                 # External services (Redis, S3, etc.)
│   └── Integration/              # Social media integrations
├── Syncra.Domain/                 # Domain entities
│   ├── Entities/
│   ├── Enums/
│   └── Interfaces/
└── Syncra.Shared/                 # Shared kernel
    ├── Constants/
    └── Extensions/
```

### 3.3 Architecture Pattern

**3-Layer + CQRS (Optional):**

```
API Controller
    ↓
Application Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Entity Framework Core → PostgreSQL
```

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

#### 4.1.1 User Authentication

- [ ] **REGISTER** - Email/password registration with email verification
- [ ] **LOGIN** - JWT token issuance on successful login
- [ ] **OAUTH LOGIN** - Support OAuth providers:
  - GitHub
  - Google
  - Wallet (Web3)
  - FarCaster
  - Custom OAuth
- [ ] **REFRESH TOKEN** - Token refresh mechanism
- [ ] **LOGOUT** - Invalidate tokens
- [ ] **PASSWORD RESET** - Password reset flow

#### 4.1.2 Role-Based Access Control (RBAC)

- [ ] Roles: ADMIN, USER, AGENCY_ADMIN
- [ ] Permissions system for granular access control
- [ ] Organization-level permissions

### 4.2 User Management

- [ ] **GET /users** - List users (admin)
- [ ] **GET /users/{id}** - Get user details
- [ ] **PUT /users/{id}** - Update user profile
- [ ] **DELETE /users/{id}** - Delete user (soft delete)
- [ ] **INVITE TEAM** - Invite users to organization
- [ ] **MANAGE ROLES** - Assign roles to users

### 4.3 Organization/Workspace Management

- [ ] **CREATE ORGANIZATION** - Create workspace
- [ ] **GET ORGANIZATIONS** - List user's organizations
- [ ] **UPDATE ORGANIZATION** - Update settings
- [ ] **DELETE ORGANIZATION** - Delete workspace
- [ ] **MEMBER MANAGEMENT** - Add/remove members
- [ ] **AGENCY MODE** - Multi-tenant for agencies

### 4.4 Social Media Integrations

#### 4.4.1 Integration Management

- [ ] **CONNECT INTEGRATION** - OAuth flow for each platform
- [ ] **DISCONNECT INTEGRATION** - Remove connected account
- [ ] **REFRESH TOKEN** - Auto-refresh expired tokens
- [ ] **GET INTEGRATIONS** - List connected accounts
- [ ] **UPDATE INTEGRATION** - Modify settings

#### 4.4.2 Supported Platforms (32)

| Category      | Platforms                                                         |
| ------------- | ----------------------------------------------------------------- |
| Microblogging | X (Twitter), Bluesky, Mastodon, Threads, Lemmy, FarCaster, Nostr  |
| Professional  | LinkedIn, LinkedIn Page                                           |
| Social        | Facebook, Instagram, Instagram Standalone, Reddit, Discord, Slack |
| Video         | YouTube, TikTok, Twitch, Kick                                     |
| Visual        | Pinterest, Dribbble, Instagram                                    |
| Business      | Google My Business                                                |
| Communities   | VK, Skool, Whop                                                   |
| Publishing    | Medium, Dev.to, Hashnode, WordPress                               |
| Newsletter    | Listmonk, Beehiiv                                                 |
| Messaging     | Telegram                                                          |
| Other         | Listmonk (email)                                                  |

#### 4.4.3 Integration Features

- [ ] Platform-specific post formatting
- [ ] Media upload per platform requirements
- [ ] Character count validation
- [ ] Hashtag suggestions
- [ ] Scheduling windows per platform

### 4.5 Post Management

#### 4.5.1 Post CRUD

- [ ] **CREATE POST** - Create new post with content/media
- [ ] **GET POSTS** - List posts with filters (status, date, integration)
- [ ] **GET POST/{id}** - Get single post details
- [ ] **UPDATE POST** - Edit post content
- [ ] **DELETE POST** - Remove post
- [ ] **DUPLICATE POST** - Copy post to another time

#### 4.5.2 Scheduling

- [ ] **SCHEDULE POST** - Set publish date/time
- [ ] **SCHEDULE MULTIPLE** - Bulk schedule posts
- [ ] **RESCHEDULE** - Change publish time
- [ ] **TIMEZONE SUPPORT** - Handle user timezones
- [ ] **BEST TIME SUGGESTION** - AI-powered optimal time suggestions
- [ ] **RECURRING POSTS** - Repeat posts (daily, weekly, monthly)

#### 4.5.3 Post States

- [ ] QUEUE - Scheduled for future
- [ ] PUBLISHED - Successfully posted
- [ ] FAILED - Posting failed
- [ ] DRAFT - Not yet scheduled
- [ ] ARCHIVED - Past posts

#### 4.5.4 Post Features

- [ ] **MEDIA ATTACHMENT** - Attach images/videos
- [ ] **SIGNATURES** - Auto-append signatures to posts
- [ ] **POST SETS** - Group posts into sets
- [ ] **COMMENTS** - Team collaboration comments
- [ ] **APPROVAL WORKFLOW** - Post approval before publishing

### 4.6 Media Library

- [ ] **UPLOAD MEDIA** - Upload images, videos, GIFs
- [ ] **GET MEDIA** - List media with pagination
- [ ] **DELETE MEDIA** - Remove media
- [ ] **THUMBNAIL GENERATION** - Auto-generate thumbnails
- [ ] **IMAGE PROCESSING** - Resize, compress (Sharp)
- [ ] **STORAGE BACKENDS** - Local, Cloudflare R2, S3

### 4.7 Analytics

- [ ] **POST ANALYTICS** - Per-post performance
- [ ] **INTEGRATION ANALYTICS** - Per-platform metrics
- [ ] **OVERVIEW DASHBOARD** - Aggregate metrics
- [ ] **EXPORT ANALYTICS** - Export reports (CSV, PDF)
- [ ] **TRACKING PIXEL** - Track engagement via pixel

### 4.8 AI/Copilot Features

- [ ] **GENERATE CONTENT** - AI-generated post drafts
- [ ] **IMPROVE CONTENT** - Rewrite/improve existing content
- [ ] **GENERATE IMAGES** - AI image generation
- [ ] **VIDEO GENERATION** - Create videos from content (Veo3)
- [ ] **STREAMING RESPONSE** - Real-time AI output
- [ ] **CREDIT SYSTEM** - Track AI usage credits

### 4.9 Billing & Subscriptions

#### 4.9.1 Stripe Integration

- [ ] **CREATE SUBSCRIPTION** - New subscription
- [ ] **UPDATE SUBSCRIPTION** - Change plan
- [ ] **CANCEL SUBSCRIPTION** - Cancel recurring
- [ ] **WEBHOOK HANDLER** - Stripe webhooks
- [ ] **INVOICE MANAGEMENT** - View invoices

#### 4.9.2 Subscription Tiers

- [ ] FREE - Limited posts, integrations
- [ ] PRO - Full features
- [ ] AGENCY - Multi-tenant, white-label

### 4.10 Webhooks

- [ ] **CREATE WEBHOOK** - Register webhook URL
- [ ] **LIST WEBHOOKS** - Get all webhooks
- [ ] **DELETE WEBHOOK** - Remove webhook
- [ ] **WEBHOOK EVENTS** - Post published, failed, etc.

### 4.11 Notifications

- [ ] **IN-APP NOTIFICATIONS** - System notifications
- [ ] **NOTIFICATION PREFERENCES** - User settings
- [ ] **EMAIL NOTIFICATIONS** - Optional email digests

### 4.12 Auto-Post Features

- [ ] **RSS FEEDS** - Auto-post from RSS
- [ ] **AUTOPOST RULES** - Conditional posting
- [ ] **CONTENT TRANSLATION** - Auto-translate content

---

## 5. API Endpoints Summary

### 5.1 Authentication

| Method | Endpoint                            | Description            |
| ------ | ----------------------------------- | ---------------------- |
| POST   | /api/auth/register                  | Register new user      |
| POST   | /api/auth/login                     | User login             |
| POST   | /api/auth/refresh                   | Refresh token          |
| POST   | /api/auth/logout                    | Logout                 |
| POST   | /api/auth/forgot-password           | Request password reset |
| POST   | /api/auth/reset-password            | Reset password         |
| GET    | /api/auth/oauth/{provider}          | OAuth login redirect   |
| GET    | /api/auth/oauth/{provider}/callback | OAuth callback         |

### 5.2 Users

| Method | Endpoint        | Description |
| ------ | --------------- | ----------- |
| GET    | /api/users      | List users  |
| GET    | /api/users/{id} | Get user    |
| PUT    | /api/users/{id} | Update user |
| DELETE | /api/users/{id} | Delete user |

### 5.3 Organizations

| Method | Endpoint                                 | Description         |
| ------ | ---------------------------------------- | ------------------- |
| GET    | /api/organizations                       | List organizations  |
| POST   | /api/organizations                       | Create organization |
| GET    | /api/organizations/{id}                  | Get organization    |
| PUT    | /api/organizations/{id}                  | Update organization |
| DELETE | /api/organizations/{id}                  | Delete organization |
| POST   | /api/organizations/{id}/members          | Add member          |
| DELETE | /api/organizations/{id}/members/{userId} | Remove member       |

### 5.4 Integrations

| Method | Endpoint                       | Description          |
| ------ | ------------------------------ | -------------------- |
| GET    | /api/integrations              | List integrations    |
| POST   | /api/integrations/connect      | Connect new platform |
| DELETE | /api/integrations/{id}         | Disconnect           |
| PUT    | /api/integrations/{id}         | Update settings      |
| POST   | /api/integrations/{id}/refresh | Refresh token        |

### 5.5 Posts

| Method | Endpoint                | Description         |
| ------ | ----------------------- | ------------------- |
| GET    | /api/posts              | List posts          |
| POST   | /api/posts              | Create post         |
| GET    | /api/posts/{id}         | Get post            |
| PUT    | /api/posts/{id}         | Update post         |
| DELETE | /api/posts/{id}         | Delete post         |
| POST   | /api/posts/{id}/publish | Publish immediately |
| POST   | /api/posts/bulk         | Bulk create         |

### 5.6 Media

| Method | Endpoint          | Description  |
| ------ | ----------------- | ------------ |
| GET    | /api/media        | List media   |
| POST   | /api/media/upload | Upload media |
| DELETE | /api/media/{id}   | Delete media |

### 5.7 Analytics

| Method | Endpoint                    | Description           |
| ------ | --------------------------- | --------------------- |
| GET    | /api/analytics/overview     | Dashboard overview    |
| GET    | /api/analytics/posts        | Post analytics        |
| GET    | /api/analytics/integrations | Integration analytics |

### 5.8 Billing

| Method | Endpoint                  | Description         |
| ------ | ------------------------- | ------------------- |
| GET    | /api/billing/subscription | Get subscription    |
| POST   | /api/billing/subscription | Create subscription |
| PUT    | /api/billing/subscription | Update subscription |
| DELETE | /api/billing/subscription | Cancel subscription |
| GET    | /api/billing/invoices     | List invoices       |

### 5.9 Webhooks

| Method | Endpoint           | Description    |
| ------ | ------------------ | -------------- |
| GET    | /api/webhooks      | List webhooks  |
| POST   | /api/webhooks      | Create webhook |
| DELETE | /api/webhooks/{id} | Delete webhook |

---

## 6. Database Schema

### 6.1 Core Entities

```csharp
// Organization - Workspace/tenant
public class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string? Slug { get; set; }
    public string? Logo { get; set; }
    public bool IsAgency { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<UserOrganization> Members { get; set; }
    public ICollection<Integration> Integrations { get; set; }
    public ICollection<Post> Posts { get; set; }
}

// User
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; }
    public string PasswordHash { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Avatar { get; set; }
    public bool IsActive { get; set; }
    public bool EmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    public ICollection<UserOrganization> Organizations { get; set; }
    public ICollection<Post> Posts { get; set; }
}

// UserOrganization - User-Org relationship with roles
public class UserOrganization
{
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public string Role { get; set; } // ADMIN, USER
    public bool IsOwner { get; set; }

    public User User { get; set; }
    public Organization Organization { get; set; }
}

// Integration - Connected social media account
public class Integration
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Provider { get; set; } // twitter, linkedin, etc.
    public string? DisplayName { get; set; }
    public string? ProfilePicture { get; set; }
    public string? ProfileId { get; set; }
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public string? CustomFields { get; set; } // JSON
    public DateTime CreatedAt { get; set; }

    public Organization Organization { get; set; }
    public ICollection<Post> Posts { get; set; }
}

// Post
public class Post
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public Guid? UserId { get; set; }
    public string Content { get; set; }
    public PostStatus Status { get; set; } // QUEUE, PUBLISHED, FAILED, DRAFT
    public DateTime? ScheduledAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? PublishError { get; set; }
    public bool IsRecurring { get; set; }
    public string? RecurringPattern { get; set; }
    public Guid? SignatureId { get; set; }
    public Guid? SetId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Organization Organization { get; set; }
    public User? User { get; set; }
    public ICollection<PostIntegration> PostIntegrations { get; set; }
    public ICollection<PostMedia> PostMedia { get; set; }
    public ICollection<PostTag> PostTags { get; set; }
}

// PostIntegration - Post-Integration many-to-many
public class PostIntegration
{
    public Guid PostId { get; set; }
    public Guid IntegrationId { get; set; }
    public string? ExternalId { get; set; } // Posted ID on platform
    public string? Response { get; set; } // API response
    public PostStatus Status { get; set; }

    public Post Post { get; set; }
    public Integration Integration { get; set; }
}

// Media
public class Media
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string FileName { get; set; }
    public string OriginalFileName { get; set; }
    public string MimeType { get; set; }
    public long FileSize { get; set; }
    public string? ThumbnailPath { get; set; }
    public string? StoragePath { get; set; }
    public string StorageProvider { get; set; } // local, r2, s3
    public int Width { get; set; }
    public int Height { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<PostMedia> PostMedia { get; set; }
}

// PostMedia - Post-Media many-to-many
public class PostMedia
{
    public Guid PostId { get; set; }
    public Guid MediaId { get; set; }
    public int Order { get; set; }

    public Post Post { get; set; }
    public Media Media { get; set; }
}

// Tag
public class Tag
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; }

    public ICollection<PostTag> PostTags { get; set; }
}

// PostTag
public class PostTag
{
    public Guid PostId { get; set; }
    public Guid TagId { get; set; }

    public Post Post { get; set; }
    public Tag Tag { get; set; }
}

// Subscription
public class Subscription
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Plan { get; set; } // free, pro, agency
    public string? StripeCustomerId { get; set; }
    public string? StripeSubscriptionId { get; set; }
    public SubscriptionStatus Status { get; set; }
    public DateTime? CurrentPeriodEnd { get; set; }
    public int PostsLimit { get; set; }
    public int IntegrationsLimit { get; set; }
    public int TeamMembersLimit { get; set; }
    public DateTime CreatedAt { get; set; }

    public Organization Organization { get; set; }
}

// Webhook
public class Webhook
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Url { get; set; }
    public string? Secret { get; set; }
    public bool IsActive { get; set; }
    public string? Events { get; set; } // JSON array
    public DateTime CreatedAt { get; set; }

    public Organization Organization { get; set; }
}

// Notification
public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Type { get; set; }
    public string Title { get; set; }
    public string? Message { get; set; }
    public string? Data { get; set; } // JSON
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; }
}

// Comment
public class Comment
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; }
    public DateTime CreatedAt { get; set; }

    public Post Post { get; set; }
    public User User { get; set; }
}

// Signature - Auto-append signatures
public class Signature
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; }
    public string Content { get; set; }
    public bool IsDefault { get; set; }
    public DateTime CreatedAt { get; set; }

    public Organization Organization { get; set; }
    public ICollection<Post> Posts { get; set; }
}

// PostSet - Group posts
public class PostSet
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }

    public Organization Organization { get; set; }
    public ICollection<Post> Posts { get; set; }
}
```

### 6.2 Enums

```csharp
public enum PostStatus
{
    Draft,
    Queue,
    Publishing,
    Published,
    Failed,
    Archived
}

public enum SubscriptionStatus
{
    Active,
    PastDue,
    Canceled,
    Trialing
}
```

---

## 7. Background Jobs (Hangfire)

| Job                      | Description                     | Schedule     |
| ------------------------ | ------------------------------- | ------------ |
| PublishScheduledPosts    | Publish posts at scheduled time | Every minute |
| RefreshIntegrationTokens | Refresh expired OAuth tokens    | Hourly       |
| SendNotifications        | Process notification queue      | Every 5 min  |
| CleanupOldPosts          | Archive old published posts     | Daily        |
| GenerateAnalytics        | Refresh analytics data          | Hourly       |
| ProcessAutoPost          | Process RSS/autopost rules      | Every 15 min |

---

## 8. Security Requirements

### 8.1 Authentication

- JWT tokens with short expiry (15 min access, 7 day refresh)
- OAuth 2.0 for social login
- Password hashing with BCrypt/Argon2

### 8.2 Authorization

- Policy-based authorization
- Resource-level permissions
- Organization-level isolation

### 8.3 API Security

- Rate limiting (per user/IP)
- Input validation with FluentValidation
- SQL injection prevention (EF Core)
- XSS protection headers
- CORS configuration

### 8.4 Data Security

- Encrypt sensitive fields (tokens)
- HTTPS only
- Secure cookie settings

---

## 9. Performance Requirements

| Metric            | Target             |
| ----------------- | ------------------ |
| API Response Time | < 200ms (p95)      |
| Concurrent Users  | 10,000+            |
| Posts/day         | 1,000,000+         |
| File Upload       | Up to 100MB        |
| Rate Limit        | 100 req/min (user) |

---

## 10. Third-Party Integrations

### 10.1 Required Services

| Service       | Purpose        | Env Variable      |
| ------------- | -------------- | ----------------- |
| PostgreSQL    | Database       | DATABASE_URL      |
| Redis         | Cache/Queue    | REDIS_URL         |
| Stripe        | Payments       | STRIPE_SECRET_KEY |
| OpenAI        | AI features    | OPENAI_API_KEY    |
| Cloudflare R2 | Media storage  | R2_ACCESS_KEY     |
| Sentry        | Error tracking | SENTRY_DSN        |

### 10.2 Social Media OAuth

Each platform requires:

- Client ID
- Client Secret
- Redirect URI
- Scopes

---

## 11. Milestones

### Phase 1: Foundation (Week 1-2)

- [ ] Project setup and structure
- [ ] Database configuration (EF Core + PostgreSQL)
- [ ] Authentication system (JWT)
- [ ] User/Organization CRUD

### Phase 2: Core Features (Week 3-4)

- [ ] Integration system (base architecture)
- [ ] Post CRUD and scheduling
- [ ] Media library
- [ ] Basic analytics

### Phase 3: Integrations (Week 5-6)

- [ ] OAuth flows for all 32 platforms
- [ ] Token refresh handling
- [ ] Platform-specific posting

### Phase 4: Advanced Features (Week 7-8)

- [ ] AI/Copilot features
- [ ] Billing (Stripe)
- [ ] Webhooks
- [ ] Notifications

### Phase 5: Polish (Week 9)

- [ ] Performance optimization
- [ ] Error handling
- [ ] Documentation
- [ ] Testing

---

## 12. Development Guidelines

### 12.1 Code Standards

- C# 12 / .NET 8
- Entity Framework Core 8
- Nullable reference types enabled
- Async/await everywhere
- Dependency Injection (built-in)
- MediatR for CQRS (optional)

### 12.2 Naming Conventions

- Controllers: `{Entity}Controller`
- Services: `{Entity}Service`
- Repositories: `{Entity}Repository`
- DTOs: `{Entity}{Operation}Dto`

### 12.3 Configuration

- Use `appsettings.json` + environment variables
- Secrets in user secrets or key vault

---

## 13. Open Questions

1. **Deployment target**: Cloud (AWS/Azure/GCP) or on-premise?
2. **CQRS pattern**: Use MediatR or stick to simple service layer?
3. **Authentication provider**: Which OAuth providers are priority?
4. **Multi-tenancy**: Single database or per-tenant database?
5. **Real-time features**: WebSockets for live updates needed?

---

## Appendix A: Similar Projects for Reference

- **N8N** - Node-based automation (similar architecture)
- **Buffer** - Social media scheduling
- **Publer** - Social media management
- **Hootsuite** - Enterprise social media management
