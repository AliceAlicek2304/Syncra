using Moq;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Application.Services;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Xunit;

namespace Syncra.UnitTests.Application;

public class PostServiceTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock = new();
    private readonly Mock<IMediaRepository> _mediaRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IPublishService> _publishServiceMock = new();

    private readonly Guid _workspaceId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    private PostService CreateService() => new(_postRepositoryMock.Object, _mediaRepositoryMock.Object, _unitOfWorkMock.Object, _publishServiceMock.Object);

    [Fact]
    public async Task CreatePostAsync_ShouldCreateDraftPost_WhenNoSchedule()
    {
        // Arrange
        var dto = new CreatePostDto(
            Title: "My first post",
            Content: "Hello world",
            ScheduledAtUtc: null,
            IntegrationId: null,
            MediaIds: null);

        Post? addedPost = null;
        _postRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Post>()))
            .Callback<Post>(p => addedPost = p)
            .Returns(Task.CompletedTask);

        var sut = CreateService();

        // Act
        var result = await sut.CreatePostAsync(_workspaceId, _userId, dto);

        // Assert
        Assert.NotNull(addedPost);
        Assert.Equal(_workspaceId, addedPost!.WorkspaceId);
        Assert.Equal(_userId, addedPost.UserId);
        Assert.Equal(PostStatus.Draft, addedPost.Status);
        Assert.Equal(dto.Title, result.Title);
        Assert.Equal("Draft", result.Status);

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task CreatePostAsync_ShouldCreateScheduledPost_WhenFutureSchedule()
    {
        // Arrange
        var scheduledAt = DateTime.UtcNow.AddHours(1);
        var dto = new CreatePostDto(
            Title: "Scheduled post",
            Content: "Content",
            ScheduledAtUtc: scheduledAt,
            IntegrationId: null,
            MediaIds: null);

        Post? addedPost = null;
        _postRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<Post>()))
            .Callback<Post>(p => addedPost = p)
            .Returns(Task.CompletedTask);

        var sut = CreateService();

        // Act
        var result = await sut.CreatePostAsync(_workspaceId, _userId, dto);

        // Assert
        Assert.NotNull(addedPost);
        Assert.Equal(PostStatus.Scheduled, addedPost!.Status);
        Assert.Equal("Scheduled", result.Status);
    }

    [Fact]
    public async Task GetPostByIdAsync_ShouldReturnNull_WhenWorkspaceMismatch()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            WorkspaceId = Guid.NewGuid(),
            UserId = _userId,
            Title = "Other workspace",
            Content = "Content",
            Status = PostStatus.Draft
        };

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        var sut = CreateService();

        // Act
        var result = await sut.GetPostByIdAsync(_workspaceId, postId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdatePostAsync_ShouldReturnNull_WhenPostNotFound()
    {
        // Arrange
        var postId = Guid.NewGuid();

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync((Post?)null);

        var dto = new UpdatePostDto(
            Title: "Updated",
            Content: "Updated content",
            ScheduledAtUtc: null,
            Status: null,
            IntegrationId: null,
            MediaIds: null);

        var sut = CreateService();

        // Act
        var result = await sut.UpdatePostAsync(_workspaceId, postId, _userId, dto);

        // Assert
        Assert.Null(result);
        _postRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Post>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Never);
    }

    [Fact]
    public async Task DeletePostAsync_ShouldReturnFalse_WhenPostNotFound()
    {
        // Arrange
        var postId = Guid.NewGuid();

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync((Post?)null);

        var sut = CreateService();

        // Act
        var result = await sut.DeletePostAsync(_workspaceId, postId);

        // Assert
        Assert.False(result);
        _postRepositoryMock.Verify(r => r.DeleteAsync(It.IsAny<Guid>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Never);
    }

    [Fact]
    public async Task DeletePostAsync_ShouldDelete_WhenPostExistsInWorkspace()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            WorkspaceId = _workspaceId,
            UserId = _userId,
            Title = "To delete",
            Content = "Content",
            Status = PostStatus.Draft
        };

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        _postRepositoryMock
            .Setup(r => r.DeleteAsync(postId))
            .Returns(Task.CompletedTask);

        var sut = CreateService();

        // Act
        var result = await sut.DeletePostAsync(_workspaceId, postId);

        // Assert
        Assert.True(result);
        _postRepositoryMock.Verify(r => r.DeleteAsync(postId), Times.Once);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task CreatePostAsync_WithValidMediaIds_ShouldAttachMedia()
    {
        // Arrange
        var mediaId1 = Guid.NewGuid();
        var mediaId2 = Guid.NewGuid();
        var mediaIds = new[] { mediaId1, mediaId2 };

        var dto = new CreatePostDto("Title", "Content", null, null, mediaIds);

        var mediaItems = new List<Media>
        {
            new() { Id = mediaId1, WorkspaceId = _workspaceId },
            new() { Id = mediaId2, WorkspaceId = _workspaceId }
        };

        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(mediaIds)).ReturnsAsync(mediaItems);

        Post? addedPost = null;
        _postRepositoryMock.Setup(r => r.AddAsync(It.IsAny<Post>()))
                         .Callback<Post>(p => addedPost = p);

        var sut = CreateService();

        // Act
        var result = await sut.CreatePostAsync(_workspaceId, _userId, dto);

        // Assert
        Assert.NotNull(addedPost);
        Assert.Equal(2, addedPost.Media.Count);
        Assert.Contains(addedPost.Media, m => m.Id == mediaId1);
        Assert.Equal(2, result.MediaIds.Count);
    }

    [Fact]
    public async Task UpdatePostAsync_WithMediaIds_ShouldReplaceMedia()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var initialMediaId = Guid.NewGuid();
        var post = new Post
        {
            Id = postId,
            WorkspaceId = _workspaceId,
            Media = new List<Media> { new() { Id = initialMediaId, WorkspaceId = _workspaceId, PostId = postId } }
        };

        _postRepositoryMock.Setup(r => r.GetByIdAsync(postId)).ReturnsAsync(post);

        var newMediaId = Guid.NewGuid();
        var dto = new UpdatePostDto("T", "C", null, null, null, new[] { newMediaId });

        var newMediaItems = new List<Media> { new() { Id = newMediaId, WorkspaceId = _workspaceId } };
        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(new[] { newMediaId })).ReturnsAsync(newMediaItems);

        var sut = CreateService();

        // Act
        await sut.UpdatePostAsync(_workspaceId, postId, _userId, dto);

        // Assert
        Assert.Equal(1, post.Media.Count);
        Assert.Equal(newMediaId, post.Media.First().Id);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task CreatePostAsync_WithInvalidMediaId_ShouldThrowException()
    {
        // Arrange
        var mediaId = Guid.NewGuid();
        var dto = new CreatePostDto("T", "C", null, null, new[] { mediaId });

        // Media from another workspace
        var mediaItems = new List<Media> { new() { Id = mediaId, WorkspaceId = Guid.NewGuid() } };
        _mediaRepositoryMock.Setup(r => r.GetByIdsAsync(new[] { mediaId })).ReturnsAsync(mediaItems);

        var sut = CreateService();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => sut.CreatePostAsync(_workspaceId, _userId, dto));
    }
}

