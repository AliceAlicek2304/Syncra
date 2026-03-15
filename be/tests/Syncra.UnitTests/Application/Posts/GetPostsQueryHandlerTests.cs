using Moq;
using Syncra.Application.Features.Posts.Queries;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Xunit;

namespace Syncra.UnitTests.Application.Posts;

public class GetPostsQueryHandlerTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock;
    private readonly GetPostsQueryHandler _handler;

    public GetPostsQueryHandlerTests()
    {
        _postRepositoryMock = new Mock<IPostRepository>();
        _handler = new GetPostsQueryHandler(_postRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_DefaultQuery_ReturnsAllPosts()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var posts = new List<Post>
        {
            Post.Create(workspaceId, "Title 1", "Content 1", null),
            Post.Create(workspaceId, "Title 2", "Content 2", null),
            Post.Create(workspaceId, "Title 3", "Content 3", null)
        };

        var query = new GetPostsQuery { WorkspaceId = workspaceId };

        _postRepositoryMock.Setup(r => r.GetFilteredAsync(
            workspaceId,
            null,
            null,
            null,
            1,
            10,
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((posts, 3));

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(3, result.TotalCount);
    }

    [Fact]
    public async Task Handle_WithStatusFilter_FiltersCorrectly()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var draftPost = Post.Create(workspaceId, "Draft", "Content", null);
        var scheduledPost = Post.Create(workspaceId, "Scheduled", "Content", DateTime.UtcNow.AddDays(1));

        var posts = new List<Post> { scheduledPost };

        var query = new GetPostsQuery
        {
            WorkspaceId = workspaceId,
            Status = PostStatus.Scheduled
        };

        _postRepositoryMock.Setup(r => r.GetFilteredAsync(
            workspaceId,
            PostStatus.Scheduled,
            null,
            null,
            1,
            10,
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((posts, 1));

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task Handle_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var posts = new List<Post>
        {
            Post.Create(workspaceId, "Title 1", "Content 1", null),
            Post.Create(workspaceId, "Title 2", "Content 2", null)
        };

        var query = new GetPostsQuery
        {
            WorkspaceId = workspaceId,
            Page = 2,
            PageSize = 10
        };

        _postRepositoryMock.Setup(r => r.GetFilteredAsync(
            workspaceId,
            null,
            null,
            null,
            2,
            10,
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((posts, 12));

        // Act
        var result = await _handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Equal(2, result.Items.Count);
        Assert.Equal(12, result.TotalCount);
        Assert.Equal(2, result.Page);
    }
}