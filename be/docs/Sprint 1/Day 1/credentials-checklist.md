# External Credentials Checklist - Sprint 1

Last Updated: 2026-03-11

## Overview

This document tracks all external credentials and integrations required for Syncra MVP. Each credential is marked with owner, due date, status, and fallback plan.

---

## Database & Infrastructure

### PostgreSQL
| Field | Value |
|-------|-------|
| **Purpose** | Primary database for application data |
| **Owner** | Tech Lead |
| **Due Date** | Day 1 |
| **Status** | ✅ Done |
| **Connection** | `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD` |
| **Fallback Plan** | Docker local PostgreSQL container via docker-compose |

### Redis
| Field | Value |
|-------|-------|
| **Purpose** | Caching and session storage |
| **Owner** | Tech Lead |
| **Due Date** | Day 2 (Can mock until then) |
| **Status** | Mock/Fallback |
| **Connection** | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| **Fallback Plan** | In-memory caching for local development |

---

## Authentication & Security

### JWT Secret
| Field | Value |
|-------|-------|
| **Purpose** | Token generation for user authentication |
| **Owner** | Dev A |
| **Due Date** | Day 1 |
| **Status** | ✅ Done |
| **Environment** | `JWT_SECRET` |
| **Fallback Plan** | Use placeholder for local dev (NOT for production) |

### Sentry DSN
| Field | Value |
|-------|-------|
| **Purpose** | Error tracking and performance monitoring |
| **Owner** | Tech Lead |
| **Due Date** | Day 3 (Can mock until then) |
| **Status** | Mock/Fallback |
| **Environment** | `SENTRY_DSN` |
| **Fallback Plan** | Console logging for local development |

---

## Payments

### Stripe
| Field | Value |
|-------|-------|
| **Purpose** | Payment processing and subscriptions |
| **Owner** | Tech Lead |
| **Due Date** | Day 4 (Sprint 2) |
| **Status** | Mock/Fallback |
| **Environment** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Fallback Plan** | Sandbox mode only; mock for local dev payment responses |

---

## OAuth Providers (Social Integration)

### X (Twitter)
| Field | Value |
|-------|-------|
| **Purpose** | Post content to X/Twitter |
| **Owner** | Dev A |
| **Due Date** | Sprint 2 |
| **Status** | Pending |
| **Environment** | `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_CALLBACK_URL` |
| **Fallback Plan** | Mock OAuth flow for local development |
| **Notes** | Requires Twitter Developer Account approval |

### TikTok
| Field | Value |
|-------|-------|
| **Purpose** | Post content to TikTok |
| **Owner** | Dev A |
| **Due Date** | Sprint 2 |
| **Status** | Pending |
| **Environment** | `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_CALLBACK_URL` |
| **Fallback Plan** | Mock OAuth flow for local development |
| **Notes** | Requires TikTok Developer Account approval |

### YouTube
| Field | Value |
|-------|-------|
| **Purpose** | Upload videos to YouTube |
| **Owner** | Dev A |
| **Due Date** | Sprint 3 |
| **Status** | Pending |
| **Environment** | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_CALLBACK_URL` |
| **Fallback Plan** | Mock OAuth flow for local development |
| **Notes** | Requires YouTube Data API v3 approval |

---

## Summary

| Credential | Owner | Due Date | Status | Critical Day 2 |
|------------|-------|----------|--------|----------------|
| PostgreSQL | Tech Lead | Day 1 | ✅ Done | Yes |
| Redis | Tech Lead | Day 2 | Mock/Fallback | No |
| JWT Secret | Dev A | Day 1 | ✅ Done | Yes |
| Sentry | Tech Lead | Day 3 | Mock/Fallback | No |
| Stripe | Tech Lead | Sprint 2 | Mock/Fallback | No |
| X OAuth | Dev A | Sprint 2 | Pending | No |
| TikTok OAuth | Dev A | Sprint 2 | Pending | No |
| YouTube OAuth | Dev A | Sprint 3 | Pending | No |

---

## Action Items

1. **Day 1 Critical:**
   - [x] Set up local PostgreSQL (Docker or local install)
   - [x] Generate JWT secret for local development

2. **Day 2 Blockers to Avoid:**
   - [ ] Ensure PostgreSQL is running and accessible
   - [ ] Database migration can be applied

3. **Future Sprints:**
   - [ ] Apply for OAuth provider developer accounts
   - [ ] Set up Stripe sandbox environment
   - [ ] Configure Sentry for production monitoring
