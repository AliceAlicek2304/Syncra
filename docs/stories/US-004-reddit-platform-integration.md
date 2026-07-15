# US-004 Reddit Platform Integration

## Status

implemented

## Lane

normal

## Product Contract

Syncra should support the Reddit platform completely:
- Users can compose posts targeting Reddit with subreddit selection, flair tags selection, post title, URL links, and video playback options.
- The Post Flair dropdown is conditionally shown only after selecting a subreddit.
- The Direct Messages (Inbox) and Comments pages support Reddit conversations and webhooks.

## Relevant Product Docs

- None.

## Acceptance Criteria

- [x] Integrate Reddit-specific form controls (subreddit, flair, title, URL, video switches) inside the Create Post Composer.
- [x] Conditionally render the Post Flair selector only after a Subreddit has been selected.
- [x] Protect dropdown list renderings with optional chaining to prevent React hydration crashes.
- [x] Safely handle missing caption maps to avoid trim crashes on first render.
- [x] Support Reddit unified Direct Messages (Inbox) and comments (with proper one-way message deletion guards).
- [x] Write and verify a robust Playwright E2E test suite running successfully across Chromium, Firefox, and Webkit.

## Design Notes

- **UI Form Component:** `PlatformSpecificForm.tsx` renders `RedditForm` conditionally under accordion expand.
- **E2E Spec:** `reddit-flows.spec.ts` mocks all auth, workspace, profile, social accounts, subreddits, flairs, and post publishing endpoints.
- **Direct Messages:** `MessagesPage.tsx` handles `reddit` under `DELETE_ONE_WAY_PLATFORMS`.
- **Comments:** `CommentsPage.tsx` handles `reddit` under platform filters, liking, and replies.

## Validation

| Layer | Expected proof | Passed |
| --- | --- | --- |
| Unit | None. | No |
| Integration | Backend and frontend production builds complete successfully. | Yes |
| E2E | `npx playwright test tests/e2e/reddit-flows.spec.ts` passes across Chromium, Firefox, and Webkit. | Yes |
| Platform | None. | No |
| Release | None. | No |

## Harness Delta

None.

## Evidence

- E2E Test execution log showing Chromium, Firefox, and Webkit browser tests passing:
  ```
  Running 3 tests using 3 workers
    3 passed (18.9s)
  ```
  Saved locally in task logs `task-722.log`.
