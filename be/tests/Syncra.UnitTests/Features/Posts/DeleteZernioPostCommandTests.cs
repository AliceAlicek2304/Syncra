using Microsoft.EntityFrameworkCore;
using Moq;
using Syncra.Application.Features.Posts.DeleteZernioPost;
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
public class DeleteZernioPostCommandTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IZernioClient> _zernioClientMock;
    private readonly DeleteZernioPostCommandHandler _handler;
    private readonly Guid _workspaceId;
    private readonly Guid _userId;

    public DeleteZernioPostCommandTests()
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

        _handler = new DeleteZernioPostCommandHandler(
            postRepository,
            uow,
            _zernioClientMock.Object,
            new Mock<Microsoft.Extensions.Logging.ILogger<DeleteZernioPostCommandHandler>>().Object);
    }

    public void Dispose()
    {
        _db.Dispose();
    }

    [Fact]
    public async Task DeleteHandler_ScheduledPost_CallsZernioCancelThenHardDeletes()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.Schedule(DateTime.UtcNow.AddDays(1));
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new DeleteZernioPostCommand(_workspaceId, post.ZernioPostId!);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.DeletePostAsync("z_123", It.IsAny<CancellationToken>()), Times.Once);

        var dbPost = await _db.Posts.FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.Null(dbPost);
    }

    [Fact]
    public async Task DeleteHandler_PublishedPost_CallsZernioDeleteThenHardDeletes()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkZernioPublished(DateTime.UtcNow);
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new DeleteZernioPostCommand(_workspaceId, post.ZernioPostId!);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.DeletePostAsync("z_123", It.IsAny<CancellationToken>()), Times.Once);

        var dbPost = await _db.Posts.FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.Null(dbPost);
    }

    [Fact]
    public async Task DeleteHandler_PartialPost_CallsZernioDeleteThenHardDeletes()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.TransitionTo(PostStatus.Publishing);
        post.MarkPublishPartial(DateTime.UtcNow, "z_123", 2);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new DeleteZernioPostCommand(_workspaceId, post.ZernioPostId!);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.DeletePostAsync("z_123", It.IsAny<CancellationToken>()), Times.Once);

        var dbPost = await _db.Posts.FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.Null(dbPost);
    }

    [Fact]
    public async Task DeleteHandler_ZernioApiFails_StillDeletesPostLocal()
    {
        // Arrange
        var post = Post.Create(_workspaceId, _userId, "Title", "Content");
        post.Schedule(DateTime.UtcNow.AddDays(1));
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        _zernioClientMock
            .Setup(x => x.DeletePostAsync("z_123", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API Error"));

        var cmd = new DeleteZernioPostCommand(_workspaceId, post.ZernioPostId!);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);

        var dbPost = await _db.Posts.FirstOrDefaultAsync(p => p.Id == post.Id);
        Assert.Null(dbPost);
    }

    [Fact]
    public async Task DeleteHandler_NotMyWorkspace_ReturnsFalse()
    {
        // Arrange
        var otherWorkspace = Guid.NewGuid();
        var post = Post.Create(otherWorkspace, _userId, "Title", "Content");
        post.Schedule(DateTime.UtcNow.AddDays(1));
        post.AssignZernioPost("z_123", 1);
        _db.Posts.Add(post);
        await _db.SaveChangesAsync();

        var cmd = new DeleteZernioPostCommand(_workspaceId, post.ZernioPostId!);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.False(result);

        var unchangedPost = await _db.Posts.FirstAsync(p => p.Id == post.Id);
        Assert.False(unchangedPost.IsDeleted);
    }

    [Fact]
    public async Task DeleteHandler_PostNotInLocalDb_CallsZernioDeleteAndReturnsTrue()
    {
        // Arrange
        var zernioPostId = "z_123";
        var cmd = new DeleteZernioPostCommand(_workspaceId, zernioPostId);

        // Act
        var result = await _handler.Handle(cmd, CancellationToken.None);

        // Assert
        Assert.True(result);
        _zernioClientMock.Verify(x => x.DeletePostAsync("z_123", It.IsAny<CancellationToken>()), Times.Once);
    }
}
