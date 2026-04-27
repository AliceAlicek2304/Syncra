#if FALSE
using Moq;
using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Interfaces;
using Syncra.Application.Services;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;
using Xunit;

namespace Syncra.UnitTests.Application;

public class PublishServiceTests
{
    private readonly Mock<IPostRepository> _postRepositoryMock = new();
    private readonly Mock<IIntegrationRepository> _integrationRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<IPublishAdapterRegistry> _adapterRegistryMock = new();
    private readonly Mock<IPublishAdapter> _adapterMock = new();

    private readonly Guid _workspaceId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    private PublishService CreateService(string platform = "x")
    {
        _adapterMock.SetupGet(p => p.ProviderId).Returns(platform);
        _adapterRegistryMock
            .Setup(r => r.GetAdapterOrDefault(platform))
            .Returns(_adapterMock.Object);
        return new PublishService(
            _postRepositoryMock.Object,
            _integrationRepositoryMock.Object,
            _unitOfWorkMock.Object,
            _adapterRegistryMock.Object);
    }

    [Theory]
    [InlineData(PostStatus.Draft)]
    [InlineData(PostStatus.Scheduled)]
    public async Task PublishAsync_ShouldTransitionToPublished_OnProviderSuccess(PostStatus initialStatus)
    {
        // Arrange
        var postId = Guid.NewGuid();
        var integrationId = Guid.NewGuid();

        var post = new Post
        {
            Id = postId,
            WorkspaceId = _workspaceId,
            UserId = _userId,
            Title = "Title",
            Content = "Content",
            Status = initialStatus,
            IntegrationId = integrationId
        };

        var integration = new Integration
        {
            Id = integrationId,
            WorkspaceId = _workspaceId,
            Platform = "x",
            IsActive = true,
            AccessToken = "at-1"
        };

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        _integrationRepositoryMock
            .Setup(r => r.GetByIdAsync(integrationId))
            .ReturnsAsync(integration);

        _adapterMock
            .Setup(p => p.PublishAsync("at-1", It.IsAny<PublishRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublishResult
            {
                IsSuccess = true,
                ExternalId = "ext-1",
                ExternalUrl = "https://example.com/post/1"
            });

        var sut = CreateService();

        // Act
        var result = await sut.PublishAsync(_workspaceId, postId, _userId);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("ext-1", result.ExternalId);
        Assert.Equal("https://example.com/post/1", result.ExternalUrl);
        Assert.Equal(PostStatus.Published, post.Status);
        Assert.NotNull(post.PublishedAtUtc);
        Assert.Equal("ext-1", post.PublishExternalId);
        Assert.Equal("https://example.com/post/1", post.PublishExternalUrl);
        Assert.Null(post.PublishLastError);

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.AtLeastOnce);
    }

    [Theory]
    [InlineData(PostStatus.Draft)]
    [InlineData(PostStatus.Scheduled)]
    public async Task PublishAsync_ShouldTransitionToFailed_OnProviderError(PostStatus initialStatus)
    {
        // Arrange
        var postId = Guid.NewGuid();
        var integrationId = Guid.NewGuid();

        var post = new Post
        {
            Id = postId,
            WorkspaceId = _workspaceId,
            UserId = _userId,
            Title = "Title",
            Content = "Content",
            Status = initialStatus,
            IntegrationId = integrationId
        };

        var integration = new Integration
        {
            Id = integrationId,
            WorkspaceId = _workspaceId,
            Platform = "x",
            IsActive = true,
            AccessToken = "at-1"
        };

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        _integrationRepositoryMock
            .Setup(r => r.GetByIdAsync(integrationId))
            .ReturnsAsync(integration);

        _adapterMock
            .Setup(p => p.PublishAsync("at-1", It.IsAny<PublishRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PublishResult
            {
                IsSuccess = false,
                Error = new ProviderError
                {
                    Code = "publish_error",
                    Message = "Provider failed"
                }
            });

        var sut = CreateService();

        // Act
        var result = await sut.PublishAsync(_workspaceId, postId, _userId);

        // Assert
        Assert.False(result.Success);
        Assert.Equal(PostStatus.Failed, post.Status);
        Assert.NotNull(post.PublishLastError);
        Assert.Contains("publish_error", post.PublishLastError);

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.AtLeastOnce);
    }

    [Fact]
    public async Task PublishAsync_ShouldNotTransition_WhenGuardFails()
    {
        // Arrange
        var postId = Guid.NewGuid();

        var post = new Post
        {
            Id = postId,
            WorkspaceId = _workspaceId,
            UserId = _userId,
            Title = "Title",
            Content = "Content",
            Status = PostStatus.Published, // terminal state should not be republished
            IntegrationId = null
        };

        _postRepositoryMock
            .Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        var sut = CreateService();

        // Act
        var result = await sut.PublishAsync(_workspaceId, postId, _userId);

        // Assert
        Assert.True(result.Success == (post.Status == PostStatus.Published));
        Assert.Equal(PostStatus.Published, post.Status);

        _adapterMock.Verify(
            p => p.PublishAsync(It.IsAny<string>(), It.IsAny<PublishRequest>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Never);
    }
}
#endif
