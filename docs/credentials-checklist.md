# External Credentials Checklist

This document tracks all external service credentials required for the Syncra backend.

## Credentials Status

| Service | Status | Owner | Due Date | Fallback |
|---------|--------|-------|----------|----------|
| PostgreSQL | Available | Dev Team | Day 1 | Local Docker container |
| Redis | Not Required | - | - | In-memory for MVP |
| JWT Secret | Not Required | - | - | Mock for Day 1 |
| Stripe | Not Required | - | - | Test mode keys later |
| Sentry | Not Required | - | - | Console logging for MVP |
| X (Twitter) | Not Required | - | - | Mock integration |
| TikTok | Not Required | - | - | Mock integration |
| YouTube | Not Required | - | - | Mock integration |

## Detailed Requirements

### PostgreSQL (Required)
- **Purpose**: Primary database
- **Type**: Connection string
- **Format**: `Host=...;Database=...;Username=...;Password=...`
- **Status**: Available (local or Docker)
- **Owner**: Dev Team
- **Fallback**: Docker PostgreSQL container

### Redis (Future - Not Day 1)
- **Purpose**: Caching and session management
- **Status**: Not required for Day 1
- **Fallback**: In-memory caching for MVP

### JWT Authentication (Future - Not Day 1)
- **Purpose**: API authentication
- **Status**: Not required for Day 1 (open API)
- **Fallback**: Will be added with auth feature

### Stripe (Future - Not Day 1)
- **Purpose**: Payment processing
- **Status**: Not required for Day 1
- **Fallback**: Sandbox keys to be obtained later

### Sentry (Future - Not Day 1)
- **Purpose**: Error tracking and monitoring
- **Status**: Not required for Day 1
- **Fallback**: Console logging for development

### X (Twitter) Integration (Future - Not Day 1)
- **Purpose**: Social media posting
- **Status**: Not required for Day 1
- **Fallback**: Mock implementation

### TikTok Integration (Future - Not Day 1)
- **Purpose**: Social media posting
- **Status**: Not required for Day 1
- **Fallback**: Mock implementation

### YouTube Integration (Future - Not Day 1)
- **Purpose**: Video publishing
- **Status**: Not required for Day 1
- **Fallback**: Mock implementation

## Notes

- Day 1 focus is on bootstrap only - no external integrations required
- All external integrations can use mock/fallback for initial development
- Credentials to be obtained as each integration feature is implemented
- Tech Lead responsible for tracking credential acquisition progress
