using Moq;
using Syncra.Application.Features.Posts.Commands;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Xunit;

namespace Syncra.UnitTests.Application.Posts;

public class UpdatePostCommandHandlerTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock;
    private readonly UpdatePostCommandHandler _handler;

    public UpdatePostCommandHandlerTests()
    {
        _postRepositoryMock = new Mock<IPostRepository>();
        _handler = new UpdatePostCommandHandler(_postRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ValidCommand_UpdatesPostSuccessfully()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        var existingPost = Post.Create(workspaceId, "Old Title", "Old content", null);
        
        var command = new UpdatePostCommand
        {
            PostId = postId,
            WorkspaceId = workspaceId,
            Title = "Updated Title",
            Content = "Updated content"
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(postId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPost);
        _postRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.True(result);
        _postRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_PostNotFound_ReturnsFalse()
    {
        // Arrange
        var command = new UpdatePostCommand
        {
            PostId = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Title = "Updated Title",
            Content = "Updated content"
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(command.PostId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Post?)null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task Handle_PublishedPost_CannotBeUpdated()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        var existingPost = Post.Create(workspaceId, "Title", "Content", null);
        existingPost.MarkPublishSuccess("external-id-123", "twitter", new Dictionary<string, object>());

        var command = new UpdatePostCommand
        {
            PostId = postId,
            WorkspaceId = workspaceId,
            Title = "Updated Title",
            Content = "Updated content"
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(postId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPost);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}