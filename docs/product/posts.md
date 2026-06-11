# Syncra Posts & Content Management

Posts represent content (text, image, video assets) distributed to one or more connected social accounts.

## Core Operations

Users can:
1. **Save Draft**: Save content without specifying a publication schedule or immediate post directive.
2. **Schedule**: Provide a future UTC timestamp (`scheduledFor`) and `timezone` to queue publishing.
3. **Publish Immediately**: Set `publishNow: true` to bypass queues and trigger the backend background worker (Hangfire) to deploy the post immediately.

## Media Upload Flow

Before including an image or video in a post:
1. Call `POST /workspaces/{workspaceId}/media/upload` (Form Data upload).
2. The backend stores the file and registers it in the database.
3. The backend returns a payload containing `mediaId` and `url`.
4. Include the returned identifier or URL when creating the post object.

## Endpoints

### Post Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/workspaces/{workspaceId}/posts` | Create a new post/idea |
| GET | `/api/v1/workspaces/{workspaceId}/posts` | List posts inside the workspace with filters |
| GET | `/api/v1/workspaces/{workspaceId}/posts/{postId}` | Fetch details of a single post |
| PUT | `/api/v1/workspaces/{workspaceId}/posts/{postId}` | Update post content or reschedule |
| DELETE | `/api/v1/workspaces/{workspaceId}/posts/{postId}` | Delete post |
| POST | `/api/v1/workspaces/{workspaceId}/posts/{postId}/publish` | Publish a draft or scheduled post immediately |

### Query Parameters for GET /posts

- `status`: Filter by status (`draft`, `scheduled`, `published`, `failed`).
- `scheduledFromUtc` / `scheduledToUtc`: Date-range boundaries.
- `page` / `pageSize`: Pagination variables (default: page `1`, size `20`).

### Media Library Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/workspaces/{workspaceId}/media/upload` | Upload a media file |
| GET | `/api/v1/workspaces/{workspaceId}/media` | List all uploaded media assets |
| DELETE | `/api/v1/workspaces/{workspaceId}/media/{mediaId}` | Delete a media asset |
