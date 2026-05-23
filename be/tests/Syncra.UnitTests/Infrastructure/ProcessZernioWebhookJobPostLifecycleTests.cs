using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Jobs;
using Syncra.Infrastructure.Persistence;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

[Trait("Category", "Post")]
[Trait("Category", "Webhook")]
public class ProcessZernioWebhookJobPostLifecycleTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IPostStatusNotifier> _notifierMock;
    private readonly Mock<IInboxNotifier> _inboxNotifierMock;
    private readonly Mock<ILogger<ProcessZernioWebhookJob>> _loggerMock;
    private readonly ProcessZernioWebhookJob _job;
    private readonly Guid _workspaceId;
    private readonly Guid _userId;

    public ProcessZernioWebhookJobPostLifecycleTests()
    {
        _workspaceId = Guid.NewGuid();
        _userId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _notifierMock = new Mock<IPostStatusNotifier>();
        _inboxNotifierMock = new Mock<IInboxNotifier>();
        _loggerMock = new Mock<ILogger<ProcessZernioWebhookJob>>();

        _job = new ProcessZernioWebhookJob(_db, _loggerMock.Object, _notifierMock.Object, _inboxNotifierMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    private async Task<Post> SeedPostAsync(Guid workspaceId, PostStatus initialStatus, string zernioPostId)
    {
        var post = Post.Create(workspaceId, _userId, "Test Title", "Test Content");

        if (initialStatus != PostStatus.Draft)
        {
            if (initialStatus == PostStatus.Scheduled)
            {
                post.TransitionTo(PostStatus.Scheduled);
            }
            else if (initialStatus == PostStatus.Publishing)
            {
                post.MarkPublishAttempt(DateTime.UtcNow);
            }
            else if (initialStatus == PostStatus.Published)
            {
                post.MarkPublishAttempt(DateTime.UtcNow);
                post.MarkZernioPublished(DateTime.UtcNow);
            }
            else if (initialStatus == PostStatus.Failed)
            {
                post.MarkPublishAttempt(DateTime.UtcNow);
                post.MarkZernioFailed(DateTime.UtcNow, "error");
            }
            else if (initialStatus == PostStatus.Partial)
            {
                post.MarkPublishAttempt(DateTime.UtcNow);
                post.MarkPublishPartial(DateTime.UtcNow, zernioPostId, 2);
            }
        }

        post.AssignZernioPost(zernioPostId, 2);

        var target1 = PostPlatformTarget.Create(workspaceId, post.Id, "twitter");
        var target2 = PostPlatformTarget.Create(workspaceId, post.Id, "instagram");
        _db.PostPlatformTargets.Add(target1);
        _db.PostPlatformTargets.Add(target2);
        post.PlatformTargets.Add(target1);
        post.PlatformTargets.Add(target2);

        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        return post;
    }

    private async Task<ZernioWebhookEvent> SeedWebhookEventAsync(Guid workspaceId, string eventType, string payload)
    {
        var evt = ZernioWebhookEvent.Create(workspaceId, eventType, payload);
        _db.ZernioWebhookEvents.Add(evt);
        await _db.SaveChangesAsync();
        return evt;
    }

    [Fact]
    public async Task PostWebhook_ScheduledEvent_FromDraft_TransitionsToScheduled()
    {
        // Arrange
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Draft, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.scheduled", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        Assert.Equal(PostStatus.Scheduled, updatedPost.Status);

        _notifierMock.Verify(n => n.NotifyAsync(
            _workspaceId,
            post.Id,
            "Scheduled",
            2,
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PostWebhook_PublishedEvent_FromPublishing_TransitionsToPublished()
    {
        // Arrange
        var zernioPostId = "zernio_456";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.published", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        Assert.Equal(PostStatus.Published, updatedPost.Status);
        Assert.NotNull(updatedPost.PublishedAtUtc);

        _notifierMock.Verify(n => n.NotifyAsync(
            _workspaceId,
            post.Id,
            "Published",
            2,
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PostWebhook_PublishedEvent_AlreadyPublished_IsNoOp()
    {
        // Arrange
        var zernioPostId = "zernio_789";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Published, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.published", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        Assert.Equal(PostStatus.Published, updatedPost.Status);

        // Notifier should not be called again
        _notifierMock.Verify(n => n.NotifyAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PostWebhook_FailedEvent_FromPublishing_TransitionsToFailed()
    {
        // Arrange
        var zernioPostId = "zernio_failed_1";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\", \"error\": \"Platform error\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.failed", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        Assert.Equal(PostStatus.Failed, updatedPost.Status);
        Assert.Equal("Platform error", updatedPost.PublishLastError);

        _notifierMock.Verify(n => n.NotifyAsync(
            _workspaceId,
            post.Id,
            "Failed",
            2,
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PostWebhook_PartialEvent_FromPublishing_TransitionsToPartial()
    {
        // Arrange
        var zernioPostId = "zernio_partial_1";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\", \"platforms\": [{{}}, {{}}]}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.partial", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        Assert.Equal(PostStatus.Partial, updatedPost.Status);

        _notifierMock.Verify(n => n.NotifyAsync(
            _workspaceId,
            post.Id,
            "Partial",
            2,
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PostWebhook_CancelledEvent_SetsIsDeleted()
    {
        // Arrange
        var zernioPostId = "zernio_cancelled_1";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Scheduled, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.cancelled", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        Assert.True(updatedPost.IsDeleted);

        _notifierMock.Verify(n => n.NotifyAsync(
            _workspaceId,
            post.Id,
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PostWebhook_ZernioPostIdInDifferentWorkspace_IsNoOp()
    {
        // Arrange
        var otherWorkspaceId = Guid.NewGuid();
        var zernioPostId = "zernio_cross_ws";
        var post = await SeedPostAsync(otherWorkspaceId, PostStatus.Draft, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}}}";

        // Webhook belongs to _workspaceId, but post belongs to otherWorkspaceId
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.scheduled", payload);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _job.ExecuteAsync(evt.Id));

        var unchangedPost = await _db.Posts.FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(unchangedPost);
        Assert.Equal(PostStatus.Draft, unchangedPost.Status);

        _notifierMock.Verify(n => n.NotifyAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PostWebhook_PostNotFound_ThrowsForRetry()
    {
        // Arrange
        var zernioPostId = "zernio_nonexistent";
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.scheduled", payload);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _job.ExecuteAsync(evt.Id));
        Assert.Equal("post_not_yet_persisted", ex.Message);

        _notifierMock.Verify(n => n.NotifyAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<IReadOnlyList<PostStatusTargetPayload>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }
}
