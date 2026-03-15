using Moq;
using Syncra.Application.Features.Workspaces.Commands;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using BC = BCrypt.Net.BCrypt;
using Xunit;

namespace Syncra.UnitTests.Application.Workspaces;

public class CreateWorkspaceCommandHandlerTests
{
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock;
    private readonly Mock<IUserRepository> _userRepositoryMock;
    private readonly CreateWorkspaceCommandHandler _handler;

    public CreateWorkspaceCommandHandlerTests()
    {
        _workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        _userRepositoryMock = new Mock<IUserRepository>();
        _handler = new CreateWorkspaceCommandHandler(_workspaceRepositoryMock.Object, _userRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesWorkspaceSuccessfully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = User.Create("user@example.com", BC.HashPassword("Password123!"));

        var command = new CreateWorkspaceCommand
        {
            OwnerId = userId,
            Name = "My Workspace",
            Slug = "my-workspace"
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        Workspace? capturedWorkspace = null;
        _workspaceRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Workspace>()))
            .Callback<Workspace>(w => capturedWorkspace = w)
            .Returns(Task.CompletedTask);

        _workspaceRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotEqual(Guid.Empty, result);
        Assert.NotNull(capturedWorkspace);
        Assert.Equal(command.Name, capturedWorkspace!.Name.Value);
        Assert.Equal(command.Slug, capturedWorkspace.Slug.Value);
    }

    [Fact]
    public async Task Handle_EmptyName_ThrowsValidationException()
    {
        // Arrange
        var command = new CreateWorkspaceCommand
        {
            OwnerId = Guid.NewGuid(),
            Name = "",
            Slug = "my-workspace"
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_InvalidSlug_ThrowsValidationException()
    {
        // Arrange
        var command = new CreateWorkspaceCommand
        {
            OwnerId = Guid.NewGuid(),
            Name = "My Workspace",
            Slug = "invalid slug!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_OwnerNotFound_ThrowsDomainException()
    {
        // Arrange
        var command = new CreateWorkspaceCommand
        {
            OwnerId = Guid.NewGuid(),
            Name = "My Workspace",
            Slug = "my-workspace"
        };

        _userRepositoryMock.Setup(r => r.GetByIdAsync(command.OwnerId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}