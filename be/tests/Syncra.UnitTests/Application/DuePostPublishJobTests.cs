using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Jobs;
using Xunit;

namespace Syncra.UnitTests.Application;

public class DuePostPublishJobTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock = new();
    private readonly Mock<IPublishService> _publishServiceMock = new();
    private readonly Mock<ILogger<DuePostPublishJob>> _loggerMock = new();

    [Fact]
    public async Task ExecuteAsync_ShouldPublishDuePosts()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();

        var duePost = new Post
        {
            Id = postId,
            WorkspaceId = workspaceId,
            UserId = userId,
            Status = PostStatus.Scheduled,
            ScheduledAtUtc = DateTime.UtcNow.AddMinutes(-5)
        };

        _postRepositoryMock
            .SetupSequence(r => r.GetDueScheduledPostsAsync(It.IsAny<DateTime>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Post> { duePost })
            .ReturnsAsync(new List<Post>());

        _publishServiceMock
            .Setup(s => s.PublishAsync(workspaceId, postId, userId, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublishResultDto(
                Success: true,
                ExternalId: "ext-1",
                ExternalUrl: "https://example.com/post/1",
                ErrorCode: null,
                ErrorMessage: null,
                RawMetadata: null));

        var job = new DuePostPublishJob(
            _postRepositoryMock.Object,
            _publishServiceMock.Object,
            _loggerMock.Object);

        // Act
        await job.ExecuteAsync(CancellationToken.None);

        // Assert
        _publishServiceMock.Verify(
            s => s.PublishAsync(workspaceId, postId, userId, false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_ShouldRetryOnTransientFailure()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();

        var duePost = new Post
        {
            Id = postId,
            WorkspaceId = workspaceId,
            UserId = userId,
            Status = PostStatus.Scheduled,
            ScheduledAtUtc = DateTime.UtcNow.AddMinutes(-5)
        };

        _postRepositoryMock
            .SetupSequence(r => r.GetDueScheduledPostsAsync(It.IsAny<DateTime>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Post> { duePost })
            .ReturnsAsync(new List<Post>());

        _publishServiceMock
            .SetupSequence(s => s.PublishAsync(workspaceId, postId, userId, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublishResultDto(
                Success: false,
                ExternalId: null,
                ExternalUrl: null,
                ErrorCode: "http_500",
                ErrorMessage: "Server error",
                RawMetadata: null))
            .ReturnsAsync(new PublishResultDto(
                Success: true,
                ExternalId: "ext-1",
                ExternalUrl: "https://example.com/post/1",
                ErrorCode: null,
                ErrorMessage: null,
                RawMetadata: null));

        var job = new DuePostPublishJob(
            _postRepositoryMock.Object,
            _publishServiceMock.Object,
            _loggerMock.Object);

        // Act
        await job.ExecuteAsync(CancellationToken.None);

        // Assert
        _publishServiceMock.Verify(
            s => s.PublishAsync(workspaceId, postId, userId, false, It.IsAny<CancellationToken>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task ExecuteAsync_ShouldNotRetryOnNonTransientFailure()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var postId = Guid.NewGuid();

        var duePost = new Post
        {
            Id = postId,
            WorkspaceId = workspaceId,
            UserId = userId,
            Status = PostStatus.Scheduled,
            ScheduledAtUtc = DateTime.UtcNow.AddMinutes(-5)
        };

        _postRepositoryMock
            .SetupSequence(r => r.GetDueScheduledPostsAsync(It.IsAny<DateTime>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Post> { duePost })
            .ReturnsAsync(new List<Post>());

        _publishServiceMock
            .Setup(s => s.PublishAsync(workspaceId, postId, userId, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublishResultDto(
                Success: false,
                ExternalId: null,
                ExternalUrl: null,
                ErrorCode: "validation_error",
                ErrorMessage: "Invalid content",
                RawMetadata: null));

        var job = new DuePostPublishJob(
            _postRepositoryMock.Object,
            _publishServiceMock.Object,
            _loggerMock.Object);

        // Act
        await job.ExecuteAsync(CancellationToken.None);

        // Assert
        _publishServiceMock.Verify(
            s => s.PublishAsync(workspaceId, postId, userId, false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Theory]
    [InlineData("timeout", null, true)]
    [InlineData("rate_limited", null, true)]
    [InlineData("transient_error", null, true)]
    [InlineData("http_500", null, true)]
    [InlineData(null, "Request timeout", true)]
    [InlineData("validation_error", "Invalid input", false)]
    [InlineData(null, null, false)]
    public void IsTransientFailure_ClassifiesErrorsCorrectly(
        string? errorCode,
        string? errorMessage,
        bool expected)
    {
        // Act
        var result = DuePostPublishJob.IsTransientFailure(errorCode, errorMessage);

        // Assert
        Assert.Equal(expected, result);
    }
}

