# Testing Patterns

**Analysis Date:** 2025-03-04

## Test Framework

**Runner:**
- xUnit (detected in `tests/Syncra.UnitTests/Syncra.UnitTests.csproj`)

**Assertion Library:**
- xUnit's built-in `Assert` class.

**Run Commands:**
```bash
dotnet test              # Run all tests
dotnet watch test        # Watch mode
```

## Test File Organization

**Location:**
- Separate project: `tests/Syncra.UnitTests/`
- Mirrors `src` structure:
  - `tests/Syncra.UnitTests/Api/`
  - `tests/Syncra.UnitTests/Application/`
  - `tests/Syncra.UnitTests/Domain/`
  - `tests/Syncra.UnitTests/Infrastructure/`

**Naming:**
- Files: `[ClassName]Tests.cs` (e.g., `PostTests.cs`, `CreateWorkspaceCommandHandlerTests.cs`)
- Methods: `Method_Condition_Expectation` (e.g., `Handle_ValidCommand_CreatesWorkspaceSuccessfully`)

**Structure:**
```
tests/Syncra.UnitTests/
├── Api/
├── Application/
│   ├── Auth/
│   └── Workspaces/
├── Domain/
└── Infrastructure/
```

## Test Structure

**Suite Organization:**
```csharp
namespace Syncra.UnitTests.Application.Workspaces;

public class CreateWorkspaceCommandHandlerTests
{
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock;
    private readonly CreateWorkspaceCommandHandler _handler;

    public CreateWorkspaceCommandHandlerTests()
    {
        // Setup mocks and SUT (System Under Test)
        _workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        _handler = new CreateWorkspaceCommandHandler(_workspaceRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesWorkspaceSuccessfully()
    {
        // Arrange
        // Setup mock expectations and data

        // Act
        // Call the method under test

        // Assert
        // Verify results and mock calls
    }
}
```

**Patterns:**
- **Setup pattern:** Constructor-based setup for common mocks and the SUT.
- **Teardown pattern:** Not explicitly used (xUnit handles this via `IDisposable` if needed).
- **Assertion pattern:** `Assert.Equal`, `Assert.NotNull`, `Assert.ThrowsAsync`.

## Mocking

**Framework:** Moq

**Patterns:**
```csharp
// Setup a return value
_userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
    .ReturnsAsync(user);

// Verify a call
_workspaceRepositoryMock.Verify(r => r.AddAsync(It.IsAny<Workspace>()), Times.Once);

// Capture an argument via Callback
Workspace? capturedWorkspace = null;
_workspaceRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Workspace>()))
    .Callback<Workspace>(w => capturedWorkspace = w)
    .Returns(Task.CompletedTask);
```

**What to Mock:**
- External dependencies: Repositories, Services, Unit of Work.
- Time/DateTime (ideally via an `IDateTimeProvider`, though not seen in use).

**What NOT to Mock:**
- Domain Entities (use real entities).
- Value Objects.
- DTOs.

## Fixtures and Factories

**Test Data:**
```csharp
var user = User.Create("user@example.com", BC.HashPassword("Password123!"));
```

**Location:**
- Mostly in-line creation within tests.
- No central factory/fixture project detected yet, but domain entities have `Create` factory methods.

## Coverage

**Requirements:** None explicitly enforced in the codebase.

**View Coverage:**
```bash
dotnet test /p:CollectCoverage=true
```

## Test Types

**Unit Tests:**
- Focus on Application Layer (Handlers) and Domain Layer (Entities).
- Extensive coverage of domain behavior in `tests/Syncra.UnitTests/Domain/`.

**Integration Tests:**
- Some infrastructure tests in `tests/Syncra.UnitTests/Infrastructure/` (e.g., `SubscriptionRepositoryTests.cs`).

**E2E Tests:**
- Not detected in the current codebase structure.

## Common Patterns

**Async Testing:**
```csharp
[Fact]
public async Task SomeMethod_ShouldDoSomething()
{
    // ...
    await _sut.DoSomethingAsync();
    // ...
}
```

**Error Testing:**
```csharp
[Fact]
public async Task Handle_InvalidInput_ThrowsDomainException()
{
    // ...
    await Assert.ThrowsAsync<DomainException>(() =>
        _handler.Handle(command, CancellationToken.None));
}
```

---

*Testing analysis: 2025-03-04*
