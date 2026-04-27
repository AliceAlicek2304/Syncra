#if FALSE
using Moq;
using Syncra.Application.Features.Posts.Commands;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Xunit;

namespace Syncra.UnitTests.Application.Posts;

public class DeletePostCommandHandlerTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock;
    private readonly DeletePostCommandHandler _handler;

    public DeletePostCommandHandlerTests()
    {
        _postRepositoryMock = new Mock<IPostRepository>();
        _handler = new DeletePostCommandHandler(_postRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ExistingPost_DeletesSuccessfully()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        var existingPost = Post.Create(workspaceId, "Title", "Content", null);

        var command = new DeletePostCommand
        {
            PostId = postId,
            WorkspaceId = workspaceId
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(postId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPost);

        _postRepositoryMock.Setup(r => r.Remove(existingPost)).Verifiable();
        _postRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.True(result);
        _postRepositoryMock.Verify(r => r.Remove(existingPost), Times.Once);
    }

    [Fact]
    public async Task Handle_PostNotFound_ReturnsFalse()
    {
        // Arrange
        var command = new DeletePostCommand
        {
            PostId = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid()
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(command.PostId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Post?)null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task Handle_PublishedPost_CannotBeDeleted()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        var existingPost = Post.Create(workspaceId, "Title", "Content", null);
        existingPost.MarkPublishSuccess("external-id", "twitter", new Dictionary<string, object>());

        var command = new DeletePostCommand
        {
            PostId = postId,
            WorkspaceId = workspaceId
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(postId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingPost);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}
#endif
