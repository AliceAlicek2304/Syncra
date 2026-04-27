#if FALSE
using Moq;
using Syncra.Application.Features.Posts.Commands;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.ValueObjects;
using Xunit;

namespace Syncra.UnitTests.Application.Posts;

public class CreatePostCommandHandlerTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock;
    private readonly CreatePostCommandHandler _handler;

    public CreatePostCommandHandlerTests()
    {
        _postRepositoryMock = new Mock<IPostRepository>();
        _handler = new CreatePostCommandHandler(_postRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_CreatesPostSuccessfully()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var command = new CreatePostCommand
        {
            WorkspaceId = workspaceId,
            Title = "Test Post Title",
            Content = "Test content",
            ScheduledAtUtc = DateTime.UtcNow.AddDays(1)
        };

        Post? capturedPost = null;
        _postRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Post>()))
            .Callback<Post>(p => capturedPost = p)
            .Returns(Task.CompletedTask);

        _postRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotEqual(Guid.Empty, result);
        Assert.NotNull(capturedPost);
        Assert.Equal(command.Title, capturedPost!.Title.Value);
        Assert.Equal(command.Content, capturedPost.Content.Value);
        Assert.Equal(workspaceId, capturedPost.WorkspaceId);
    }

    [Fact]
    public async Task Handle_EmptyTitle_ThrowsValidationException()
    {
        // Arrange
        var command = new CreatePostCommand
        {
            WorkspaceId = Guid.NewGuid(),
            Title = "",
            Content = "Test content"
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_NullWorkspaceId_ThrowsValidationException()
    {
        // Arrange
        var command = new CreatePostCommand
        {
            WorkspaceId = Guid.Empty,
            Title = "Test Title",
            Content = "Test content"
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_PastScheduledDate_ThrowsValidationException()
    {
        // Arrange
        var command = new CreatePostCommand
        {
            WorkspaceId = Guid.NewGuid(),
            Title = "Test Title",
            Content = "Test content",
            ScheduledAtUtc = DateTime.UtcNow.AddDays(-1)
        };

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}
#endif
