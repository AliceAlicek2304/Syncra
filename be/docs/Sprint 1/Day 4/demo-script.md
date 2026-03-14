# Day 4 Demo Script - Post CRUD & YouTube Integration

This script guides the manual demo for Day 4, focusing on Post CRUD and YouTube integration.

## Prerequisites
- Backend `Syncra.Api` is running (e.g. on `https://localhost:5001`).
- Database is migrated and reachable.
- You have a test user account and can obtain a JWT via the auth endpoints.
- A workspace has been created for the test user.

## 1. Authenticate and Resolve Workspace
1. Call `POST /api/v1/auth/login` with the test user credentials.
2. Copy the returned JWT access token.
3. Call `GET /api/v1/workspaces` with `Authorization: Bearer {token}` to list workspaces.
4. Choose a `workspaceId` from the response for the remainder of the demo.

## 2. Create a Post
1. Call `POST /api/v1/workspaces/{workspaceId}/posts` with body:
   ```json
   {
     "title": "Day 4 Demo Post",
     "content": "This post is created during the Day 4 demo.",
     "scheduledAtUtc": null,
     "integrationId": null,
     "mediaIds": null
   }
   ```
2. Verify the response returns `201 Created` with a `PostDto` payload and `status` of `"Draft"`.
3. Note the returned `id` for later steps.

## 3. List Posts with Filters
1. Call `GET /api/v1/workspaces/{workspaceId}/posts` with:
   - Query: `?status=Draft&page=1&pageSize=20`
2. Verify the response contains the created post and respects the status filter.
3. Optionally test date filters using `scheduledFromUtc` / `scheduledToUtc` if you have scheduled posts.

## 4. Update a Post
1. Call `PUT /api/v1/workspaces/{workspaceId}/posts/{postId}` using the `id` from the create step:
   ```json
   {
     "title": "Day 4 Demo Post (Updated)",
     "content": "Updated content for the Day 4 demo.",
     "scheduledAtUtc": null,
     "status": "Published",
     "integrationId": null,
     "mediaIds": null
   }
   ```
2. Verify the response returns `200 OK` and the `status` is `"Published"`.
3. Optionally confirm via a follow-up `GET` by id.

## 5. Connect YouTube Integration
1. Call `POST /api/v1/workspaces/{workspaceId}/integrations/youtube/connect?redirectUri={callbackUrl}` to initiate OAuth.
2. Open the returned `url` in a browser and complete the YouTube OAuth flow.
3. After redirect back to the callback endpoint, verify the API responds with a successful integration payload.
4. Optionally list integrations with `GET /api/v1/workspaces/{workspaceId}/integrations` to confirm the YouTube integration is active.

## 6. Delete a Post
1. Call `DELETE /api/v1/workspaces/{workspaceId}/posts/{postId}` using the id from the create step.
2. Verify the response is `204 No Content`.
3. Call `GET /api/v1/workspaces/{workspaceId}/posts/{postId}` and confirm it returns `404 Not Found`.

## 7. Wrap-Up
- Highlight that:
  - Post CRUD is fully wired through domain, service, and API layers.
  - Basic status handling and filters are in place.
  - YouTube integration flow is functional and can be associated with posts in future work.

