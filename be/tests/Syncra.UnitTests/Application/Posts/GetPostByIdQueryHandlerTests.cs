#if FALSE
using Moq;
using Syncra.Application.Features.Posts.Queries;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Xunit;

namespace Syncra.UnitTests.Application.Posts;

public class GetPostByIdQueryHandlerTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock;
    private readonly GetPostByIdQueryHandler _handler;

    public GetPostByIdQueryHandlerTests()
    {
        _postRepositoryMock = new Mock<IPostRepository>();
        _handler = new GetPostByIdQueryHandler(_postRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ExistingPost_ReturnsPostDto()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        var post = Post.Create(workspaceId, "Test Title", "Test Content", DateTime.UtcNow.AddDays(1));

        var query = new GetPostByIdQuery
        {
            PostId = postId,
            WorkspaceId = workspaceId
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(postId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(post);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Title", result.Title);
        Assert.Equal("Test Content", result.Content);
    }

    [Fact]
    public async Task Handle_NonExistentPost_ReturnsNull()
    {
        // Arrange
        var query = new GetPostByIdQuery
        {
            PostId = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid()
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(query.PostId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Post?)null);

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Null(result);
    }
}
#endif
