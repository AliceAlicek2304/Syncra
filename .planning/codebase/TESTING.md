# Testing Patterns

**Analysis Date:** 2026-05-14

## Test Framework — Frontend

**Runner:**
- **Vitest** v4.1.5
- Config: `fe/vitest.config.ts`
- DOM environment: `jsdom` (v29.1.1)

**Assertion Library:**
- Built-in Vitest assertions (`expect`)
- `@testing-library/jest-dom` v6.9.1 for DOM matchers

**Run Commands:**
```bash
npm run test:unit              # vitest run (single pass)
npm run test:unit:watch        # vitest (watch mode)
npm run test:e2e               # playwright test
```

## Test File Organization — Frontend

**Location:** Co-located with source files

| Source File | Test File |
|---|---|
| `fe/src/api/posts.ts` | `fe/src/api/posts.test.ts` |
| `fe/src/components/PageWrapper.tsx` | `fe/src/components/PageWrapper.test.tsx` |
| `fe/src/components/ProtectedRoute.tsx` | `fe/src/components/ProtectedRoute.test.tsx` |
| `fe/src/context/AuthContext.tsx` | `fe/src/context/AuthContext.test.tsx` |
| `fe/src/hooks/useR2Upload.ts` | `fe/src/hooks/useR2Upload.test.ts` |

**Naming:** `*.test.ts` or `*.test.tsx` — no `.spec.*` files detected

**Test Setup File:** `fe/src/test/setup.ts`
- Imports `@testing-library/jest-dom` matchers
- Registers `afterEach(() => cleanup())` for DOM cleanup
- Mocks `framer-motion` globally (renders motion elements as plain HTML for jsdom compatibility)

## Test Structure — Frontend

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postsApi } from './posts'
import api from '../lib/axios'

// Mock at module level
vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

describe('postsApi', () => {
  const workspaceId = 'ws-123'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getPosts calls correct endpoint', async () => {
    // Arrange
    mockedApi.get.mockResolvedValue({ data: [] })
    // Act
    await postsApi.getPosts(workspaceId, { status: 'draft' })
    // Assert
    expect(mockedApi.get).toHaveBeenCalledWith(
      `workspaces/${workspaceId}/posts`,
      { params: { status: 'draft' } }
    )
  })
})
```

**Patterns:**
- `describe`/`it` blocks (no `test()` calls)
- `beforeEach(() => vi.clearAllMocks())` in every test suite
- Module-level `vi.mock()` calls (hoisted automatically by Vitest)
- Test constants defined at describe-scope level (`workspaceId`, `postId`)

## Mocking — Frontend

**Framework:** Vitest built-in (`vi.fn()`, `vi.mock()`, `vi.mocked()`)

**Patterns:**

1. **Mocking the axios instance (API tests):**
```typescript
// fe/src/api/posts.test.ts
vi.mock('../lib/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const mockedApi = api as unknown as Record<string, ReturnType<typeof vi.fn>>
```

2. **Mocking context/hooks (Component tests):**
```typescript
// fe/src/components/ProtectedRoute.test.tsx
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// In test:
vi.mocked(useAuth).mockReturnValue({
  user: { userId: '123', email: 'test@example.com' },
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
} as unknown as ReturnType<typeof useAuth>)
```

3. **Mocking API modules (Hook tests):**
```typescript
// fe/src/hooks/useR2Upload.test.ts
vi.mock('../api/media', () => ({
  mediaApi: {
    presignUpload: vi.fn(),
    confirmUpload: vi.fn(),
  },
}))
```

4. **Mocking plain axios (non-shared instance):**
```typescript
vi.mock('axios', () => ({
  default: { put: vi.fn() },
}))
```

**What to Mock:**
- External API calls (via axios instance)
- Context hooks (`useAuth`, `useWorkspace`)
- Browser APIs not available in jsdom (framer-motion is globally mocked in `setup.ts`)

**What NOT to Mock:**
- React components under test
- Pure utility functions
- React Router's `MemoryRouter` (used directly in tests)

## Component Testing Patterns — Frontend

**Rendering:**
- `render()` from `@testing-library/react`
- `renderHook()` from `@testing-library/react` for context/hook tests
- `screen.getByText()`, `screen.getByTestId()`, `screen.getByRole()`, `screen.getByLabelText()` for assertions
- `container.firstChild` for direct DOM element access

**User Interaction:**
- `fireEvent.click()` from `@testing-library/react`
- `act(async () => { ... })` for async state updates in hook/context tests

**Router Integration:**
- `MemoryRouter` with `initialEntries` for route-dependent component tests
- `Routes` + `Route` configuration to test navigation outcomes

```typescript
// ProtectedRoute.test.tsx — routing example
render(
  <MemoryRouter initialEntries={['/protected']}>
    <Routes>
      <Route path="/protected" element={<ProtectedRoute><div data-testid="child">Child</div></ProtectedRoute>} />
      <Route path="/login" element={<div data-testid="login">Login Page</div>} />
    </Routes>
  </MemoryRouter>
)
```

## API Test Patterns — Frontend

All API tests follow the same structure:

1. Mock `../lib/axios` with `vi.mock()` at module top
2. Cast mocked API: `api as unknown as Record<string, ReturnType<typeof vi.fn>>`
3. In each `it()` block:
   - Set up mock return value: `mockedApi.get.mockResolvedValue({ data: [] })`
   - Call the API method
   - Assert the correct endpoint and params were called

**Test files (6 total):**
- `fe/src/api/posts.test.ts` — 6 tests
- `fe/src/api/ideas.test.ts` — 5 tests
- `fe/src/api/groups.test.ts` — 4 tests
- `fe/src/api/media.test.ts` — 4 tests
- `fe/src/api/ai.test.ts` — 2 tests
- `fe/src/api/auth.test.ts` — expected but not detected (auth tests may exist elsewhere)

## Component Tests — Frontend

**Test files (5 total):**
- `fe/src/components/PageWrapper.test.tsx` — 4 tests (renders children, data-testid, custom testid, reduced motion)
- `fe/src/components/ProtectedRoute.test.tsx` — 3 tests (authenticated, unauthenticated redirect, loading state)
- `fe/src/components/SkeletonLoader.test.tsx` — 7 tests (aria, CSS classes, inline styles)
- `fe/src/components/WidgetErrorFallback.test.tsx` — 6 tests (text rendering, button click, accessibility roles)
- `fe/src/components/Toast.test.tsx` — expected but not detected

## Context Tests — Frontend

**Test files (1 total):**
- `fe/src/context/AuthContext.test.tsx` — 4 tests (null user start, hydrate from token, login flow, logout flow)

**Pattern:**
```typescript
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)
const { result } = renderHook(() => useAuth(), { wrapper })
```

## Hook Tests — Frontend

**Test files (1 total):**
- `fe/src/hooks/useR2Upload.test.ts` — 3 tests (initial state, upload flow, deduplication skip)

**Key patterns:**
- Render hook with `renderHook(() => useR2Upload())`
- Wrap async calls in `act(async () => { ... })`
- Assert both mock function calls and state changes

## Fixtures and Factories — Frontend

**Test Data:**
- Inline mock data defined within test files
- Common pattern: constants like `MOCK_USER`, `MOCK_AUTH_RESPONSE` defined before `describe` block

```typescript
// fe/src/context/AuthContext.test.tsx
const MOCK_USER = {
  userId: '123',
  email: 'test@example.com',
  displayName: 'Test User',
}

const MOCK_AUTH_RESPONSE = {
  token: 'mock-token',
  refreshToken: 'mock-refresh-token',
  expiresAtUtc: '2026-05-03T12:00:00Z',
}
```

**Location:** Fixtures are defined inline — no dedicated fixtures directory detected.

**Test data prefixes:** `mockCreatePostResponse`, `mockCreateIdeaResponse` with unique test ID prefixes like `idea-456`, `post-789`.

## Coverage — Frontend

**Requirements:** Not enforced (no coverage threshold detected in `vitest.config.ts`)

**Current Coverage:**
- API layer: 6 test files covering all 6 API modules
- Components: 5 test files (PageWrapper, ProtectedRoute, SkeletonLoader, WidgetErrorFallback — plus expected Toast)
- Context: 1 test file (AuthContext)
- Hooks: 1 test file (useR2Upload)

**View Coverage:**
```bash
npx vitest run --coverage   # Only if coverage reporter is configured
```

## Test Types — Frontend

**Unit Tests (Vitest):**
- API endpoint verification (endpoint URLs, method, body)
- Component rendering and behavior
- Context state management
- Hook logic

**Integration Tests (Vitest):**
- Context + hook integration (e.g., AuthContext provider wrapping useAuth)
- Component + context integration (e.g., ProtectedRoute with mocked AuthContext)

**E2E Tests (Playwright):**
- Framework: `@playwright/test` v1.59.1
- Config: `fe/playwright.config.ts` — runs against `http://localhost:5173/Syncra/`
- Test directory: `fe/tests/e2e/`
- Browsers: Chromium only (Desktop Chrome)

**E2E Test Files (5 total):**
- `fe/tests/e2e/phase8-uat.spec.ts`
- `fe/tests/e2e/phase9-uat.spec.ts`
- `fe/tests/e2e/phase10-uat.spec.ts`
- `fe/tests/e2e/phase11-core-flows.spec.ts` — 5 tests (login, dashboard error-free, create post modal, navigation, logout)
- `fe/tests/e2e/phase11-animations.spec.ts`

**E2E Run Command:**
```bash
npx playwright test      # From fe/ directory
```

**E2E Pattern:**
```typescript
import { test, expect } from '@playwright/test'

test('Login flow completes and dashboard renders', async ({ page }) => {
  await page.goto(`${APP_URL}/login?notour=true`)
  await page.fill('[data-testid="login-email"]', 'test@syncra.local')
  await page.fill('[data-testid="login-password"]', 'Test@12345')
  await page.click('[data-testid="login-submit"]')
  await page.waitForURL(/.*dashboard/, { timeout: 10000 })
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.locator('[data-testid="page-wrapper"]')).toBeVisible()
})
```

**Key `data-testid` values used in E2E tests:**
- `login-email`, `login-password`, `login-submit`
- `page-wrapper`
- `widget-error-fallback`
- `create-post-btn`, `logout-btn`

## Test Framework — Backend

**Runner:**
- **xUnit** v2.9.0
- Project: `be/tests/Syncra.UnitTests/Syncra.UnitTests.csproj`
- Target: .NET 8.0

**Assertion Libraries:**
- xUnit built-in (`Assert.ThrowsAsync`, `Assert.Equal`, etc.)
- FluentAssertions v8.8.0 (available but not widely used in examined tests)
- Moq v4.20.72 for mocking

**Run Commands:**
```bash
dotnet test be/tests/Syncra.UnitTests
```

## Test Structure — Backend

**Suite Organization:**
```csharp
using Xunit;
using Moq;

namespace Syncra.UnitTests.Infrastructure;

public class PostRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public PostRepositoryTests()
    {
        // Arrange base: SQLite in-memory
        _connection = new SqliteConnection("Filename=:memory:;Foreign Keys=False");
        _connection.Open();
        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection).Options;
        using var context = new AppDbContext(_options);
        context.Database.EnsureCreated();
    }

    [Fact]
    public async Task GetFilteredAsync_FiltersByWorkspaceId()
    {
        // Arrange
        // Act
        // Assert
    }
}
```

**Patterns:**
- `[Fact]` attributes for test methods
- `IDisposable` for cleanup (SQLite connection teardown)
- Arrange/Act/Assert comment blocks
- Constructor-based test setup

## Mocking — Backend

**Framework:** Moq 4.20.72

**Patterns:**
```csharp
private readonly Mock<IPostRepository> _postRepositoryMock = new();
private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();

// Setup
_postRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Post>()))
    .Callback<Post>(p => capturedPost = p)
    .Returns(Task.CompletedTask);
```

**Integration Test Mocks:**
- SQLite in-memory database for EF Core integration (`PostRepositoryTests.cs`)
- Mock `IWorkspaceRepository`, `IUnitOfWork`, `ILogger<T>` for service tests (`StripeServiceTests.cs`)

## Coverage — Backend

**Requirements:** coverlet v6.0.0 collector included in test project, but no threshold configured

## Test Types — Backend

**Unit Tests:**
- Domain logic tests (Post entity behavior)
- Command/Query handler tests (CQRS validation, business rules)
- Service tests (StripeService, TokenService)

**Integration Tests:**
- Repository tests with real SQLite in-memory database
- Controller tests with mocked services

**Disabled Tests:**
- Several test files are wrapped in `#if FALSE` preprocessor blocks, effectively disabling them:
  - `CreatePostCommandHandlerTests.cs`
  - `SubscriptionsControllerTests.cs`
  - `PostTests.cs`
  - `MediaControllerTests.cs` (referenced in glob but not found)
  - Various other BE unit tests
- Only a few tests remain active: `PostRepositoryTests.cs`, `StripeServiceTests.cs`, and others not in `#if FALSE`

## Common Patterns

**Async Testing (FE):**
```typescript
import { act } from '@testing-library/react'

await act(async () => {
  assetId = await result.current.upload(mockFile, 'ws-123')
})
```

**Async Testing (BE):**
```csharp
[Fact]
public async Task Handle_ValidCommand_CreatesPostSuccessfully()
{
    var result = await _handler.Handle(command, CancellationToken.None);
    Assert.NotEqual(Guid.Empty, result);
}
```

**Error Testing (FE):**
```typescript
it('skips PUT if presignedUrl is empty (deduplication case)', async () => {
    vi.mocked(mediaApi.presignUpload).mockResolvedValue(presignRes)
    await act(async () => {
      assetId = await result.current.upload(mockFile, 'ws-123')
    })
    expect(axios.put).not.toHaveBeenCalled()
})
```

**Error Testing (BE):**
```csharp
[Fact]
public async Task Handle_EmptyTitle_ThrowsValidationException()
{
    await Assert.ThrowsAsync<DomainException>(() =>
        _handler.Handle(command, CancellationToken.None));
}
```

**Reduced Motion Testing (FE):**
```typescript
const { useReducedMotion } = vi.mocked(await import('framer-motion'));
(useReducedMotion as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);
```

## Test Gaps

- **Toast component:** No test file for `fe/src/components/Toast.tsx` (despite having a testable API)
- **AuthContext.test.ts**: No test for failed hydration (token exists but API call fails)
- **useR2Upload**: No error-path test (what happens when presign or PUT fails)
- **Backend tests**: Majority disabled with `#if FALSE` — only ~2-3 test files are active
- **No integration controller tests**: No running server/WebApplicationFactory tests detected
- **Coverage enforcement**: No coverage thresholds set for either FE or BE

---

*Testing analysis: 2026-05-14*
