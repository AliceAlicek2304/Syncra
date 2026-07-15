# Overview

## Current Behavior

Currently, Syncra supports TikTok, Facebook, LinkedIn, YouTube, and Reddit. Instagram integration exists partially in backend analytics, webhook commented-post parsing, and frontend CSS styling/Lucide icon setup, but is marked as `isSupported: false` in the UI connection list and is not included in the post composer's active platform types, platform validators, or settings DTOs.

## Target Behavior

Users can:
1. Connect their Instagram Business/Creator account from the Connections settings page (Direct Connect flow via Zernio SDK).
2. Select Instagram in the platform list inside the post composer.
3. Configure Instagram-specific settings:
   - `publishAs` ("post" | "reel" | "story") which maps to Zernio's `contentType` field.
   - `firstComment` (auto-first-comment).
   - `collaborators` (array of public Business/Creator usernames).
   - `locationId` (custom location ID).
   - `altText` (media accessibility description).
4. View post previews for Instagram.
5. Publish immediately or schedule posts targeting Instagram, including cross-posting to other platforms.
6. Retrieve Instagram comments, send replies, and interact with Instagram DMs from the Inbox.
7. Access Instagram metrics and demographics on the Analytics page.

## Affected Users

- Creators and social media managers who want to cross-publish posts to Instagram alongside other platforms and manage comments/DMs.

## Affected Product Docs

- None.

## Non-Goals

- Implementing Instagram personal account connections (unsupported by Zernio API).
- Customizing comment likes or ice breakers via Syncra UI.
