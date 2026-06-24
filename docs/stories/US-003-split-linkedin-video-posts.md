# US-003 Split LinkedIn Video Posts

## Status

implemented

## Lane

normal

## Product Contract

When a post contains video media and targets both LinkedIn and other platforms, Syncra should split it into two separate posts to prevent LinkedIn 401 token authentication errors on multi-platform video uploads in Zernio.
- Post 1: LinkedIn-only post containing video media items.
- Post 2: Other platforms post containing all original media items.
- Both posts are tracked independently and cannot be edited.

## Relevant Product Docs

- [posts.md](file:///d:/Code/Syncra/docs/product/posts.md)

## Acceptance Criteria

- [x] Create a property `IsSplitVideoPost` on `Post` entity, mapping it to database.
- [x] If a post contains video media and targets both LinkedIn and other platforms, split it into two separate Zernio requests.
- [x] Persist both post entities in the local database, marked with `IsSplitVideoPost = true`.
- [x] Return the DTO of Post 2 (other platforms) to the frontend.
- [x] Return the `IsSplitVideoPost` flag in `PostDto` and map it for both get and list endpoints.
- [x] On the frontend, if a post is a split video post, editing it is disabled. Attempting to edit will show a toast error message and close the modal.
- [x] On the backend, attempting to edit a split video post throws a domain exception.

## Design Notes

- **Database Property:** `IsSplitVideoPost` (bool) defaults to `false`.
- **Command Handler:** `CreateZernioPostCommandHandler` handles the splitting logic and calls Zernio API twice.
- **Guard:** `UpdateZernioPostCommandHandler` throws `DomainException` on editing a split post.
- **Frontend Guard:** `useCreatePostState.ts` blocks loading/submitting an edit for split posts.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | `dotnet test be/tests/Syncra.UnitTests/Syncra.UnitTests.csproj` passes |
| Integration | Backend builds and runs successfully |
| E2E | Frontend compiles and functions correctly in browser |

## Harness Delta

None.

## Evidence

None.
