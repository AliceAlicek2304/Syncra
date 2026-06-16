using Microsoft.EntityFrameworkCore;
using Moq;
using Syncra.Application.Features.Posts.UnpublishZernioPost;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Syncra.UnitTests.Features.Posts;

[Trait("Category", "Post")]
public class UnpublishZernioPostCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly UnpublishZernioPostCommandHandler _handler;
    private readonly Guid _workspaceId;
    private readonly Guid _userId;

    public UnpublishZernioPostCommandTests()
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

        _handler = new UnpublishZernioPostCommandHandler(
            postRepository,
            uow,
            _zernioClientMock.Object,
            new Mock<Microsoft.Extensions.Logging.ILogger<UnpublishZernioPostCommandHandler>>().Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task UnpublishHandler_PublishedPost_CallsUnpublishAndSoftDeletes()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioPublished(DateTime.UtcNow);
        post.AssignZernioPost("z_123", 1);

        var fbTarget = PostPlatformTarget.Create(_workspaceId, post.Id, "facebook");
        fbTarget.MarkPublished("fb_ext_id", null, DateTime.UtcNow);

        _db.Posts.Add(post);
        _db.PostPlatformTargets.Add(fbTarget);
        await _db.SaveChangesAsync();

        var cmd = new UnpublishZernioPostCommand(_workspaceId, post.ZernioPostId!, "facebook");

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.UnpublishPostAsync("z_123", "facebook", It.IsAny<CancellationToken>()), Times.Once);

        var deletedPost = await _db.Posts.IgnoreQueryFilters().FirstAsync(p => p.Id == post.Id);
        Assert.True(deletedPost.IsDeleted);
    }

    [Fact]
    public async Task UnpublishHandler_PublishedPostWithPlatforms_CallsUnpublishForSpecifiedPlatformOnly()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioPublished(DateTime.UtcNow);
        post.AssignZernioPost("z_123", 2);

        var fbTarget = PostPlatformTarget.Create(_workspaceId, post.Id, "facebook");
        fbTarget.MarkPublished("fb_ext_id", null, DateTime.UtcNow);
        var twTarget = PostPlatformTarget.Create(_workspaceId, post.Id, "twitter");
        twTarget.MarkPublished("tw_ext_id", null, DateTime.UtcNow);

        _db.Posts.Add(post);
        _db.PostPlatformTargets.AddRange(fbTarget, twTarget);
        await _db.SaveChangesAsync();

        var cmd = new UnpublishZernioPostCommand(_workspaceId, post.ZernioPostId!, "facebook");

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.UnpublishPostAsync("z_123", "facebook", It.IsAny<CancellationToken>()), Times.Once);
        _zernioClientMock.Verify(x => x.UnpublishPostAsync("z_123", "twitter", It.IsAny<CancellationToken>()), Times.Never);

        var deletedPost = await _db.Posts.IgnoreQueryFilters().FirstAsync(p => p.Id == post.Id);
        Assert.True(deletedPost.IsDeleted);
    }

    [Fact]
    public async Task UnpublishHandler_NotMyWorkspace_ReturnsFalse()
    {
        // Arrange
        var otherWorkspace = Guid.NewGuid();
        var post = Post.Create(otherWorkspace, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioPublished(DateTime.UtcNow);
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new UnpublishZernioPostCommand(_workspaceId, post.ZernioPostId!, "facebook");

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.False(result);
        _zernioClientMock.Verify(x => x.UnpublishPostAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);

        var unchangedPost = await _db.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.False(unchangedPost.IsDeleted);
    }

    [Fact]
    public async Task UnpublishHandler_ZernioApiFails_StillUpdatesPostLocal()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioPublished(DateTime.UtcNow);
        post.AssignZernioPost("z_123", 1);

        var fbTarget = PostPlatformTarget.Create(_workspaceId, post.Id, "facebook");
        fbTarget.MarkPublished("fb_ext_id", null, DateTime.UtcNow);

        _db.Posts.Add(post);
        _db.PostPlatformTargets.Add(fbTarget);
        await _db.SaveChangesAsync();

        _zernioClientMock
            .Setup(x => x.UnpublishPostAsync("z_123", "facebook", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API Error"));

        var cmd = new UnpublishZernioPostCommand(_workspaceId, post.ZernioPostId!, "facebook");

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);

        var updatedPost = await _db.Posts.IgnoreQueryFilters().FirstAsync(p => p.Id == post.Id);
        Assert.True(updatedPost.IsDeleted);
    }

    [Fact]
    public async Task UnpublishHandler_PostNotInLocalDb_CallsZernioApiDirectly()
    {
        // Arrange
        var zernioPostId = "z_123";
        var cmd = new UnpublishZernioPostCommand(_workspaceId, zernioPostId, "facebook");

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.UnpublishPostAsync("z_123", "facebook", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task UnpublishHandler_PublishedPost_DeleteFromDbFalse_CallsUnpublishAndKeepsPostInDb()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioPublished(DateTime.UtcNow);
        post.AssignZernioPost("z_123", 1);

        var fbTarget = PostPlatformTarget.Create(_workspaceId, post.Id, "facebook");
        fbTarget.MarkPublished("fb_ext_id", null, DateTime.UtcNow);

        _db.Posts.Add(post);
        _db.PostPlatformTargets.Add(fbTarget);
        await _db.SaveChangesAsync();

        var cmd = new UnpublishZernioPostCommand(_workspaceId, post.ZernioPostId!, "facebook", false);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.UnpublishPostAsync("z_123", "facebook", It.IsAny<CancellationToken>()), Times.Once);

        var dbPost = await _db.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.False(dbPost.IsDeleted);
        Assert.Equal(PostStatus.Failed, dbPost.Status);

        var dbTarget = await _db.PostPlatformTargets.FirstAsync(t => t.Id == fbTarget.Id);
        Assert.Equal(PostPlatformStatus.Failed, dbTarget.Status);
    }
}
