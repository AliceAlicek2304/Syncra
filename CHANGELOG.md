# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.0.1] - 2026-03-22

### Added
- **feat: Implement Connect Account UI** — Added Linked Accounts section in Settings with dynamic platform cards for X/Twitter, Facebook, YouTube, and TikTok. Cards show real connection status, token health badges, and connect/disconnect actions with confirmation modal.
- **feat: Integration API service** — Added `fe/src/api/integrations.ts` with typed API methods for list, connect, disconnect, and health check.
- **feat: useIntegrations hook** — Added custom hook managing integration state, loading, and connect/disconnect actions with workspace context.
- **feat: Toast notification system** — Added `ToastContext` for global toast notifications across the app. OAuth callback results display success/error toasts on Settings page.
- **feat: DisconnectConfirm modal** — Added confirmation popover before disconnecting accounts to prevent accidental disconnections.
- **feat: Bootstrap vitest test framework** — Added vitest + @testing-library/react for frontend unit and component tests. Added test setup, example test, and npm scripts.
- **feat: CORS policy** — Added CORS policy allowing localhost:5173 and localhost:3000 for frontend development.
- **feat: AI-powered idea generation** — Added Groq-powered AI for generating content ideas, repurposing content across platforms, and content assistance.
- **feat: Authentication UI** — Added login/register modal with JWT token management and refresh token rotation.
- **feat: Workspace management UI** — Added sidebar workspace switcher and workspaces page for multi-workspace management.
- **feat: Development data seeder** — Added dev auth data seeder for test accounts (owner, admin, member, viewer roles).
- **feat: Analytics enhancements** — Enhanced analytics page to fetch data based on active workspace.

### Changed
- **style: Update IdeasPage API endpoints** — Changed from `/posts` to `/ideas` endpoints with drag source status handling.
- **style: Normalize post content** — Normalized content handling for posts in Ideas and Calendar pages.

### Fixed
- **fix: CORS blocking frontend API calls** — Frontend was unable to call backend APIs due to missing CORS policy.
