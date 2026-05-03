# Testing Patterns

**Analysis Date:** 2025-02-14

## Test Framework

### Backend (.NET)
**Runner:**
- xUnit 2.9.0
- Config: `be/tests/Syncra.UnitTests/Syncra.UnitTests.csproj`

**Assertion Library:**
- FluentAssertions 8.8.0
- xUnit default assertions (mix detected)

**Run Commands:**
```bash
dotnet test be/tests/Syncra.UnitTests    # Run all unit tests
```

### Frontend (React)
**Runner:**
- Not detected. No Vitest or Jest configuration found in `fe/package.json`.

## Test File Organization

### Backend
**Location:**
- Separate project: `be/tests/Syncra.UnitTests/`

**Naming:**
- `{ClassBeingTested}Tests.cs` (e.g., `PostTests.cs`, `StripeServiceTests.cs`)

**Structure:**
```
be/tests/Syncra.UnitTests/
├── Api/              # Controller tests
├── Application/      # Service and logic tests
├── Domain/           # Entity and value object tests
└── Infrastructure/   # Repository and external service tests
```

## Test Structure (Backend)

**Suite Organization:**
```csharp
namespace Syncra.UnitTests.Domain;

public class PostTests
{
    [Fact]
    public void Method_ShouldResult_WhenCondition()
    {
        // Arrange
        // ...
        
        // Act
        // ...
        
        // Assert
        // ...
    }
}
```

**Patterns:**
- **Setup pattern:** Dependencies mocked in constructor. System Under Test (SUT) instantiated in constructor or in individual tests.
- **Assertion pattern:** `Assert.Equal(expected, actual)` or FluentAssertions `.Should().Be()`.

## Mocking (Backend)

**Framework:** Moq 4.20.72

**Patterns:**
```csharp
private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock = new();

// In Test:
_workspaceRepositoryMock.Setup(x => x.GetByIdAsync(it))
    .ReturnsAsync(workspace);

var sut = new StripeService(_workspaceRepositoryMock.Object, ...);
```

**What to Mock:**
- Interfaces for repositories (`IWorkspaceRepository`).
- Interfaces for units of work (`IUnitOfWork`).
- External service interfaces (`ILogger`, `IOptions`).

**What NOT to Mock:**
- Domain entities (`Post`, `Workspace`) - these are created using factory methods.
- Value objects.

## Fixtures and Factories

**Test Data:**
```csharp
var workspace = Workspace.Create(userId, "Test Workspace", "test-workspace");
var post = Post.Create(workspace.Id, userId, "Title", "Content");
```

**Location:**
- Factories are built into Domain entities as static `Create` methods.

## Coverage

**Requirements:** None explicitly enforced in configuration.

**View Coverage:**
- Not explicitly configured in `package.json` or `.csproj`.

## Test Types

**Unit Tests:**
- Primary focus. Located in `be/tests/Syncra.UnitTests/`.
- Covers Domain logic, Value Object validation, and Infrastructure service logic (e.g., Stripe integration logic).

**Integration Tests:**
- Not explicitly separated into a project. Some Infrastructure tests interact with Stripe (via mocks) or EF Core (often using in-memory or real db if configured).

**E2E Tests:**
- Manual smoke tests documented in `be/docs/smoke-run-day-7.md`.
- No automated E2E framework (e.g., Playwright, Cypress) detected.

## Common Patterns

**Async Testing:**
```csharp
[Fact]
public async Task Method_ShouldSucceedAsync()
{
    var result = await _sut.DoSomethingAsync();
    Assert.NotNull(result);
}
```

**Error Testing:**
```csharp
[Fact]
public void Method_ShouldThrow_WhenInvalid()
{
    Assert.Throws<DomainException>(() => _sut.InvalidAction());
}
```

---

*Testing analysis: 2025-02-14*
