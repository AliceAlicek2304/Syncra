using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Application.Services;
using Syncra.Domain.Common;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Services;

public class ZernioWorkspaceAnalyticsServiceTests
{
    private readonly Mock<IZernioClient> _zernioClient = new();
    private readonly Mock<IZernioProfileRepository> _zernioProfileRepo = new();
    private readonly Mock<IPostRepository> _postRepo = new();
    private readonly Mock<ISocialAccountRepository> _socialAccountRepo = new();
    private readonly Mock<IAnalyticsCache> _cache = new();
    private readonly Mock<ILogger<ZernioWorkspaceAnalyticsService>> _logger = new();
    private readonly ZernioWorkspaceAnalyticsService _service;
    private readonly Guid _workspaceId = Guid.NewGuid();

    public ZernioWorkspaceAnalyticsServiceTests()
    {
        _socialAccountRepo.Setup(r => r.GetByWorkspaceIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync(Array.Empty<SocialAccount>());

        _service = new ZernioWorkspaceAnalyticsService(
            _zernioClient.Object,
            _zernioProfileRepo.Object,
            _postRepo.Object,
            _socialAccountRepo.Object,
            _cache.Object,
            _logger.Object);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldReturnEmpty_WhenNoZernioProfile()
    {
        // Arrange
        _zernioProfileRepo.Setup(r => r.GetByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync((ZernioProfile?)null);

        // Act
        var result = await _service.GetSummaryAsync(_workspaceId, 30, default);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.Value.TotalReach);
        Assert.Equal(0, result.Value.TotalPosts);
        Assert.Empty(result.Value.WeeklyReach);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldReturnCached_WhenCacheHit()
    {
        // Arrange
        var cached = new WorkspaceAnalyticsSummaryDto(500, 3.5, 20, 10, Array.Empty<WeeklyReachDto>());
        var cacheKey = $"zernio:analytics:summary:{_workspaceId}:30";

        _zernioProfileRepo.Setup(r => r.GetByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(ZernioProfile.Create(_workspaceId, "prof_cached", "Cached Profile", "all"));
        _cache.Setup(c => c.GetAsync<WorkspaceAnalyticsSummaryDto>(cacheKey, default))
            .ReturnsAsync(cached);

        // Act
        var result = await _service.GetSummaryAsync(_workspaceId, 30, default);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(500, result.Value.TotalReach);
        _zernioClient.Verify(c => c.GetDailyMetricsAsync(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), default), Times.Never);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldSetCacheWith60MinTtl_WhenCacheMiss()
    {
        // Arrange
        var profileId = "prof_abc";
        var profile = ZernioProfile.Create(_workspaceId, profileId, "Test Profile", "all");

        _zernioProfileRepo.Setup(r => r.GetByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(profile);

        _cache.Setup(c => c.GetAsync<WorkspaceAnalyticsSummaryDto>(It.IsAny<string>(), default))
            .ReturnsAsync((WorkspaceAnalyticsSummaryDto?)null);

        _zernioClient.Setup(c => c.GetDailyMetricsAsync(profileId, It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), default))
            .ReturnsAsync(new ZernioDailyMetricsDto(Array.Empty<ZernioDailyDataPointDto>(), null));

        _postRepo.Setup(r => r.GetAnalyticsDataAsync(_workspaceId, null, default))
            .ReturnsAsync(new List<Syncra.Domain.Models.Analytics.AnalyticsPostData>());

        // Act
        var result = await _service.GetSummaryAsync(_workspaceId, 30, default);

        // Assert
        Assert.True(result.IsSuccess);
        _cache.Verify(c => c.SetAsync(
            It.Is<string>(k => k.StartsWith($"zernio:analytics:summary:{_workspaceId}")),
            It.IsAny<WorkspaceAnalyticsSummaryDto>(),
            It.Is<TimeSpan>(ts => ts == TimeSpan.FromMinutes(60)),
            default), Times.Once);
    }

    [Fact]
    public async Task GetPostMetricsAsync_ShouldFail_WhenPostNotFound()
    {
        // Arrange
        var postId = Guid.NewGuid();
        _postRepo.Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync((Post?)null);

        // Act
        var result = await _service.GetPostMetricsAsync(_workspaceId, postId, default);

        // Assert
        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task GetPostMetricsAsync_ShouldFail_WhenPostZernioPostIdIsNull()
    {
        // Arrange
        var postId = Guid.NewGuid();
        var post = Post.Create(_workspaceId, Guid.NewGuid(), "Title", "Content", null);
        _postRepo.Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        // Act
        var result = await _service.GetPostMetricsAsync(_workspaceId, postId, default);

        // Assert
        Assert.True(result.IsFailure);
        _zernioClient.Verify(c => c.GetPostAnalyticsAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetPostMetricsAsync_ShouldRejectCrossWorkspaceAccess()
    {
        // Arrange
        var otherWorkspaceId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var post = Post.Create(_workspaceId, Guid.NewGuid(), "Title", "Content", null);
        _postRepo.Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        // Act
        var result = await _service.GetPostMetricsAsync(otherWorkspaceId, postId, default);

        // Assert
        Assert.True(result.IsFailure);
        _zernioClient.Verify(c => c.GetPostAnalyticsAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetPostMetricsAsync_ShouldSetCacheWith10MinTtl()
    {
        // Arrange
        var profileId = "prof_abc";
        var postId = Guid.NewGuid();
        var cacheKey = $"zernio:analytics:post:{_workspaceId}:{postId}";

        var profile = ZernioProfile.Create(_workspaceId, profileId, "Test Profile", "all");

        _zernioProfileRepo.Setup(r => r.GetByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(profile);

        var post = Post.Create(_workspaceId, Guid.NewGuid(), "Title", "Content", null);
        typeof(Post).GetProperty("ZernioPostId")?.SetValue(post, "zernio_post_123");
        _postRepo.Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        _cache.Setup(c => c.GetAsync<PostMetricsDto>(It.IsAny<string>(), default))
            .ReturnsAsync((PostMetricsDto?)null);

        _zernioClient.Setup(c => c.GetPostAnalyticsAsync("zernio_post_123", default))
            .ReturnsAsync(new ZernioPostAnalyticsDto(
                new PostAnalyticsFields(100, 200, 10, 5, 3, 2, 50, 150, 8.5m, DateTime.UtcNow),
                null,
                false));

        // Act
        var result = await _service.GetPostMetricsAsync(_workspaceId, postId, default);

        // Assert
        Assert.True(result.IsSuccess);
        _cache.Verify(c => c.SetAsync(
            It.Is<string>(k => k.StartsWith($"zernio:analytics:post:{_workspaceId}")),
            It.IsAny<PostMetricsDto>(),
            It.Is<TimeSpan>(ts => ts == TimeSpan.FromMinutes(10)),
            default), Times.Once);
    }

    [Fact]
    public async Task GetPostMetricsAsync_ShouldReturnSyncPending_WhenZernioReturnsSyncPending()
    {
        // Arrange
        var postId = Guid.NewGuid();

        var profile = ZernioProfile.Create(_workspaceId, "prof_abc", "Test Profile", "all");

        _zernioProfileRepo.Setup(r => r.GetByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(profile);

        var post = Post.Create(_workspaceId, Guid.NewGuid(), "Title", "Content", null);
        typeof(Post).GetProperty("ZernioPostId")?.SetValue(post, "zernio_post_123");
        _postRepo.Setup(r => r.GetByIdAsync(postId))
            .ReturnsAsync(post);

        _cache.Setup(c => c.GetAsync<PostMetricsDto>(It.IsAny<string>(), default))
            .ReturnsAsync((PostMetricsDto?)null);

        _zernioClient.Setup(c => c.GetPostAnalyticsAsync("zernio_post_123", default))
            .ReturnsAsync(new ZernioPostAnalyticsDto(
                new PostAnalyticsFields(0, 0, 0, 0, 0, 0, 0, 0, 0, null),
                null,
                true));

        // Act
        var result = await _service.GetPostMetricsAsync(_workspaceId, postId, default);

        // Assert - SyncPending true means the service still returns PostMetricsDto with zeros
        Assert.True(result.IsSuccess);
        Assert.Equal(0, result.Value.Impressions);
    }
}
