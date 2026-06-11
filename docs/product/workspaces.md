# Syncra Workspaces & Scoping

Workspaces act as the primary multi-tenancy and data isolation boundaries in Syncra. All social accounts, posts, analytics, groups, and media library uploads are owned by and scoped to a specific workspace.

## Scoping Mechanics

To verify which workspace a request applies to, the system uses two parallel patterns:

1. **Path Parameters**:
   Most workspace-specific resource endpoints require a `{workspaceId}` path variable.
   Example:
   ```http
   GET /api/v1/workspaces/{workspaceId}/posts
   ```

2. **Scoping Headers (X-Workspace-Id)**:
   For specific endpoints (such as billing or newer analytics), the client must supply the active workspace identifier in the request headers:
   ```http
   X-Workspace-Id: <workspaceId>
   ```

## Endpoints

### Workspace Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/workspaces` | List all workspaces the current user has access to |
| POST | `/api/v1/workspaces` | Create a new workspace |

### Group Management
Groups allow logical categorizations of posts/ideas inside a workspace.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/workspaces/{workspaceId}/groups` | List all groups inside the workspace |
| POST | `/api/v1/workspaces/{workspaceId}/groups` | Create a new group |
| GET | `/api/v1/workspaces/{workspaceId}/groups/{groupId}` | Get details of a single group |
| PUT | `/api/v1/workspaces/{workspaceId}/groups/{groupId}` | Update group properties |
| DELETE | `/api/v1/workspaces/{workspaceId}/groups/{groupId}` | Delete group |
