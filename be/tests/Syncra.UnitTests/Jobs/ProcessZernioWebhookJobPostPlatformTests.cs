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
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Syncra.UnitTests.Jobs;

[Trait("Category", "Post")]
[Trait("Category", "Webhook")]
public class ProcessZernioWebhookJobPostPlatformTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IPostStatusNotifier> _notifierMock;
    private readonly Mock<IInboxNotifier> _inboxNotifierMock;
    private readonly Mock<ILogger<ProcessZernioWebhookJob>> _loggerMock;
    private readonly ProcessZernioWebhookJob _job;
    private readonly Guid _workspaceId;
    private readonly Guid _userId;

    public ProcessZernioWebhookJobPostPlatformTests()
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
        }

        post.AssignZernioPost(zernioPostId, 2);

        var target1 = PostPlatformTarget.Create(workspaceId, post.Id, "twitter");
        target1.SetZernioAccountId("acc_aaa");
        
        var target2 = PostPlatformTarget.Create(workspaceId, post.Id, "twitter");
        target2.SetZernioAccountId("acc_bbb");
        
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
    public async Task PlatformPublishedEvent_UpdatesTargetByZernioAccountId()
    {
        // Arrange
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}, \"platform\": {{\"name\": \"twitter\", \"platformPostId\": \"p_123\", \"publishedUrl\": \"http://url\"}}, \"account\": {{\"accountId\": \"acc_bbb\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.platform.published", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);

        var targetA = updatedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_aaa");
        var targetB = updatedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_bbb");

        Assert.NotNull(targetA);
        Assert.NotNull(targetB);
        Assert.Equal(PostPlatformStatus.Pending, targetA!.Status);
        Assert.Equal(PostPlatformStatus.Published, targetB!.Status);
        Assert.Equal("p_123", targetB.ExternalPostId);
        Assert.Equal("http://url", targetB.ExternalPostUrl);
    }

    [Fact]
    public async Task PlatformFailedEvent_UpdatesTargetByZernioAccountId()
    {
        // Arrange
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}, \"platform\": {{\"name\": \"twitter\", \"error\": \"Platform error\"}}, \"account\": {{\"accountId\": \"acc_bbb\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.platform.failed", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);

        var targetA = updatedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_aaa");
        var targetB = updatedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_bbb");

        Assert.NotNull(targetA);
        Assert.NotNull(targetB);
        Assert.Equal(PostPlatformStatus.Pending, targetA!.Status);
        Assert.Equal(PostPlatformStatus.Failed, targetB!.Status);
        Assert.Equal("Platform error", targetB.ErrorMessage);
    }

    [Fact]
    public async Task PlatformFailedEvent_LongErrorMessage_IsTruncated()
    {
        // Arrange
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var longError = new string('x', 1500);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}, \"platform\": {{\"name\": \"twitter\", \"error\": \"{longError}\"}}, \"account\": {{\"accountId\": \"acc_bbb\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.platform.failed", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(updatedPost);
        var targetB = updatedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_bbb");

        Assert.NotNull(targetB);
        Assert.Equal(PostPlatformStatus.Failed, targetB!.Status);
        Assert.Equal(1000, targetB.ErrorMessage!.Length);
        Assert.Equal(new string('x', 1000), targetB.ErrorMessage);
    }

    [Fact]
    public async Task PlatformEvent_CrossWorkspaceMatch_IsNoOp()
    {
        // Arrange
        var otherWorkspaceId = Guid.NewGuid();
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(otherWorkspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}, \"platform\": {{\"name\": \"twitter\"}}, \"account\": {{\"accountId\": \"acc_bbb\"}}}}";
        
        // Webhook for _workspaceId but post in otherWorkspaceId
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.platform.published", payload);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => _job.ExecuteAsync(evt.Id));

        var unchangedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(unchangedPost);
        var targetB = unchangedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_bbb");
        Assert.NotNull(targetB);
        Assert.Equal(PostPlatformStatus.Pending, targetB!.Status);
    }

    [Fact]
    public async Task PlatformEvent_MissingTarget_LogsWarningNoThrow()
    {
        // Arrange
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}, \"platform\": {{\"name\": \"twitter\"}}, \"account\": {{\"accountId\": \"acc_missing\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.platform.published", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        var unchangedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.NotNull(unchangedPost);
        var targetA = unchangedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_aaa");
        var targetB = unchangedPost.PlatformTargets.FirstOrDefault(t => t.ZernioAccountId == "acc_bbb");
        Assert.NotNull(targetA);
        Assert.NotNull(targetB);
        Assert.Equal(PostPlatformStatus.Pending, targetA!.Status);
        Assert.Equal(PostPlatformStatus.Pending, targetB!.Status);
    }

    [Fact]
    public async Task PlatformPublishedEvent_PushesSignalRWithUpdatedTargets()
    {
        // Arrange
        var zernioPostId = "zernio_123";
        var post = await SeedPostAsync(_workspaceId, PostStatus.Publishing, zernioPostId);
        var payload = $"{{\"post\": {{\"id\": \"{zernioPostId}\"}}, \"platform\": {{\"name\": \"twitter\", \"platformPostId\": \"p_123\", \"publishedUrl\": \"http://url\"}}, \"account\": {{\"accountId\": \"acc_bbb\"}}}}";
        var evt = await SeedWebhookEventAsync(_workspaceId, "post.platform.published", payload);

        // Act
        await _job.ExecuteAsync(evt.Id);

        // Assert
        _notifierMock.Verify(n => n.NotifyAsync(
            _workspaceId,
            post.Id,
            post.Status.ToString(),
            2,
            It.Is<IReadOnlyList<PostStatusTargetPayload>>(l => l.Count == 2 && l.Any(t => t.Status == "Published")),
            It.IsAny<CancellationToken>()), Times.Once);
    }
}
