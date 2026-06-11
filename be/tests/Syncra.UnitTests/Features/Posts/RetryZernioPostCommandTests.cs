using Microsoft.EntityFrameworkCore;
using Moq;
using Syncra.Application.Features.Posts.RetryZernioPost;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using System.Linq;

namespace Syncra.UnitTests.Features.Posts;

[Trait("Category", "Post")]
public class RetryZernioPostCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly RetryZernioPostCommandHandler _handler;
    private readonly Guid _workspaceId;
    private readonly Guid _userId;

    public RetryZernioPostCommandTests()
    {
        _workspaceId = Guid.NewGuid();
        _userId = Guid.NewGuid();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _zernioClientMock = new Mock<IZernioClient>();

        var postRepository = new PostRepository(_db);
        var uow = new UnitOfWork(_db);

        var storageServiceMock = new Mock<IStorageService>();
        storageServiceMock.Setup(s => s.GetPresignedUrl(It.IsAny<string>(), It.IsAny<double>()))
            .Returns<string, double>((url, exp) => url);

        _handler = new RetryZernioPostCommandHandler(postRepository, uow, _zernioClientMock.Object, storageServiceMock.Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task RetryHandler_FailedPost_ResetsOnlyFailedTargets()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkPublishPartial(DateTime.UtcNow, "z_123", 3);
        
        var t1 = PostPlatformTarget.Create(_workspaceId, post.Id, "twitter");
        t1.MarkPublished("e_1", "url", DateTime.UtcNow);
        var t2 = PostPlatformTarget.Create(_workspaceId, post.Id, "facebook");
        t2.MarkFailed("err", DateTime.UtcNow);
        var t3 = PostPlatformTarget.Create(_workspaceId, post.Id, "linkedin");
        t3.MarkFailed("err", DateTime.UtcNow);

        post.PlatformTargets.Add(t1);
        post.PlatformTargets.Add(t2);
        post.PlatformTargets.Add(t3);

        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new RetryZernioPostCommand(_workspaceId, post.Id);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(PostStatus.Publishing.ToString(), result.Status);

        var updatedPost = await _db.Posts.Include(p => p.PlatformTargets).FirstAsync(p => p.Id == post.Id);
        
        var ut1 = updatedPost.PlatformTargets.First(t => t.Platform == "twitter");
        var ut2 = updatedPost.PlatformTargets.First(t => t.Platform == "facebook");
        var ut3 = updatedPost.PlatformTargets.First(t => t.Platform == "linkedin");

        Assert.Equal(PostPlatformStatus.Published, ut1.Status);
        Assert.Equal(PostPlatformStatus.Pending, ut2.Status);
        Assert.Equal(PostPlatformStatus.Pending, ut3.Status);

        _zernioClientMock.Verify(x => x.RetryPostAsync("z_123", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RetryHandler_TransitionsPostToPublishing()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioFailed(DateTime.UtcNow, "fail");
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new RetryZernioPostCommand(_workspaceId, post.Id);

        // Act
        await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        var updatedPost = await _db.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.Equal(PostStatus.Publishing, updatedPost.Status);
    }

    [Fact]
    public async Task RetryHandler_CallsZernioRetryWithZernioPostId()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioFailed(DateTime.UtcNow, "fail");
        post.AssignZernioPost("z_456", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new RetryZernioPostCommand(_workspaceId, post.Id);

        // Act
        await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        _zernioClientMock.Verify(x => x.RetryPostAsync("z_456", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RetryHandler_ScheduledPost_Throws()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.Schedule(DateTime.UtcNow.AddDays(1));
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new RetryZernioPostCommand(_workspaceId, post.Id);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<DomainException>(() => _handler.Handle(cmd, CancellationToken.None));
        Assert.Equal("invalid_state", ex.Code);
    }

    [Fact]
    public async Task RetryHandler_NotMyWorkspace_ReturnsNull()
    {
        // Arrange
        var otherWorkspace = Guid.NewGuid();
        var post = Post.Create(otherWorkspace, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioFailed(DateTime.UtcNow, "fail");
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new RetryZernioPostCommand(_workspaceId, post.Id);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.Null(result);
    }
}
