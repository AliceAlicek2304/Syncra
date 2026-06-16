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
            _socialAccountRepo.Object,
            _cache.Object,
            _logger.Object);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldReturnEmpty_WhenNoZernioProfile()
    {
        // Arrange
        _zernioProfileRepo.Setup(r => r.GetActiveByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(new List<ZernioProfile>());

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
        var cacheKey = $"zernio:analytics:summary:{_workspaceId}:default:30";

        _zernioProfileRepo.Setup(r => r.GetActiveByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(new List<ZernioProfile> { ZernioProfile.Create(_workspaceId, "prof_cached", "Cached Profile", "all") });
        _cache.Setup(c => c.GetAsync<WorkspaceAnalyticsSummaryDto>(cacheKey, default))
            .ReturnsAsync(cached);

        // Act
        var result = await _service.GetSummaryAsync(_workspaceId, 30, default);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(500, result.Value.TotalReach);
        _zernioClient.Verify(c => c.GetDailyMetricsAsync(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldSetCacheWith60MinTtl_WhenCacheMiss()
    {
        // Arrange
        var profileId = "prof_abc";
        var profile = ZernioProfile.Create(_workspaceId, profileId, "Test Profile", "all");

        _zernioProfileRepo.Setup(r => r.GetActiveByWorkspaceIdAsync(_workspaceId))
            .ReturnsAsync(new List<ZernioProfile> { profile });

        _cache.Setup(c => c.GetAsync<WorkspaceAnalyticsSummaryDto>(It.IsAny<string>(), default))
            .ReturnsAsync((WorkspaceAnalyticsSummaryDto?)null);

        _zernioClient.Setup(c => c.GetDailyMetricsAsync(profileId, It.IsAny<DateTime?>(), It.IsAny<DateTime?>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioDailyMetricsDto(Array.Empty<ZernioDailyDataPointDto>(), Array.Empty<ZernioPlatformBreakdownDto>()));

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
}
