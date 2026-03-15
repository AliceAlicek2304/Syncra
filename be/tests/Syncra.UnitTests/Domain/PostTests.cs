using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Xunit;

namespace Syncra.UnitTests.Domain;

public class PostTests
{
    private readonly Guid _workspaceId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    [Fact]
    public void Create_ShouldSetCorrectStatus_WhenNoSchedule()
    {
        // Act
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");

        // Assert
        Assert.Equal(PostStatus.Draft, post.Status);
        Assert.Equal("Title", post.Title.Value);
        Assert.Equal("Content", post.Content.Value);
    }

    [Fact]
    public void Create_ShouldSetScheduledStatus_WhenFutureSchedule()
    {
        // Arrange
        var futureTime = DateTime.UtcNow.AddHours(1);

        // Act
        var post = Post.Create(_workspaceId, _userId, "Title", "Content", futureTime);

        // Assert
        Assert.Equal(PostStatus.Scheduled, post.Status);
    }

    [Fact]
    public void Schedule_ShouldThrow_WhenTimeIsInPast()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");

        // Act & Assert
        Assert.Throws<DomainException>(() => post.Schedule(DateTime.UtcNow.AddHours(-1)));
    }

    [Fact]
    public void Schedule_ShouldThrow_WhenPostAlreadyPublished()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.MarkPublishSuccess(DateTime.UtcNow, "external-id", "http://url");

        // Act & Assert
        Assert.Throws<DomainException>(() => post.Schedule(DateTime.UtcNow.AddHours(1)));
    }

    [Fact]
    public void Unschedule_ShouldThrow_WhenNotScheduled()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");

        // Act & Assert
        Assert.Throws<DomainException>(() => post.Unschedule());
    }

    [Fact]
    public void UpdateContent_ShouldThrow_WhenPublished()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.MarkPublishSuccess(DateTime.UtcNow, "external-id", "http://url");

        // Act & Assert
        Assert.Throws<DomainException>(() => post.UpdateContent("New Title", "New Content"));
    }

    [Fact]
    public void CanBePublished_ShouldReturnFalse_WhenNoIntegration()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");

        // Act
        var canPublish = post.CanBePublished();

        // Assert
        Assert.False(canPublish);
    }

    [Fact]
    public void CanBePublished_ShouldReturnFalse_WhenScheduledForFuture()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content", DateTime.UtcNow.AddHours(2), Guid.NewGuid());

        // Act
        var canPublish = post.CanBePublished();

        // Assert
        Assert.False(canPublish);
    }

    [Fact]
    public void CanBePublished_ShouldReturnTrue_WhenReady()
    {
        // Arrange
        var integrationId = Guid.NewGuid();
        var post = Post.Create(_workspaceId, _userId, "Title", "Content", null, integrationId);

        // Act
        var canPublish = post.CanBePublished();

        // Assert
        Assert.True(canPublish);
    }

    [Fact]
    public void MarkPublishSuccess_ShouldSetCorrectState()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content", null, Guid.NewGuid());
        var now = DateTime.UtcNow;

        // Act
        post.MarkPublishSuccess(now, "external-123", "https://example.com");

        // Assert
        Assert.Equal(PostStatus.Published, post.Status);
        Assert.Equal("external-123", post.PublishExternalId);
        Assert.Equal("https://example.com", post.PublishExternalUrl);
        Assert.NotNull(post.PublishedAtUtc);
    }

    [Fact]
    public void MarkPublishFailure_ShouldSetFailedStatus()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content", null, Guid.NewGuid());
        post.MarkPublishAttempt(DateTime.UtcNow);
        var now = DateTime.UtcNow;

        // Act
        post.MarkPublishFailure(now, "Some error");

        // Assert
        Assert.Equal(PostStatus.Failed, post.Status);
        Assert.Equal("Some error", post.PublishLastError);
    }

    [Fact]
    public void Retry_ShouldResetStatus_WhenFailed()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content", null, Guid.NewGuid());
        post.MarkPublishAttempt(DateTime.UtcNow);
        post.MarkPublishFailure(DateTime.UtcNow, "Error");

        // Act
        post.Retry();

        // Assert
        Assert.Equal(PostStatus.Draft, post.Status);
        Assert.Null(post.PublishLastError);
    }

    [Fact]
    public void Retry_ShouldThrow_WhenNotFailed()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");

        // Act & Assert
        Assert.Throws<DomainException>(() => post.Retry());
    }

    [Fact]
    public void AddMedia_ShouldThrow_WhenMediaFromDifferentWorkspace()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        var otherWorkspaceMedia = new Media { Id = Guid.NewGuid(), WorkspaceId = Guid.NewGuid() };

        // Act & Assert
        Assert.Throws<DomainException>(() => post.AddMedia(otherWorkspaceMedia));
    }

    [Fact]
    public void TransitionTo_ShouldThrow_WhenInvalidTransition()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");

        // Act & Assert
        Assert.Throws<DomainException>(() => post.TransitionTo(PostStatus.Published));
    }
}