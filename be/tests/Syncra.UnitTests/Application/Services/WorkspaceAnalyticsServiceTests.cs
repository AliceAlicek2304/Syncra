using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Interfaces;
using Syncra.Application.Services;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Analytics;
using Syncra.Domain.Models.Social;
using Xunit;

namespace Syncra.UnitTests.Application.Services;

public class WorkspaceAnalyticsServiceTests
{
    private readonly Mock<IIntegrationRepository> _integrationRepo = new();
    private readonly Mock<IPostRepository> _postRepo = new();
    private readonly Mock<IIntegrationAnalyticsService> _intAnalyticsService = new();
    private readonly Mock<IAnalyticsCache> _cache = new();
    private readonly Mock<ILogger<WorkspaceAnalyticsService>> _logger = new();
    private readonly WorkspaceAnalyticsService _service;

    public WorkspaceAnalyticsServiceTests()
    {
        _service = new WorkspaceAnalyticsService(
            _integrationRepo.Object,
            _postRepo.Object,
            _intAnalyticsService.Object,
            _cache.Object,
            _logger.Object);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldReturnFromCache_WhenCacheHit()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var cachedSummary = new WorkspaceAnalyticsSummaryDto(100, 5.5, 10, 5, Array.Empty<WeeklyReachDto>());
        _cache.Setup(c => c.GetAsync<WorkspaceAnalyticsSummaryDto>(It.IsAny<string>(), default))
            .ReturnsAsync(cachedSummary);

        // Act
        var result = await _service.GetSummaryAsync(workspaceId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal(cachedSummary, result.Value);
        _intAnalyticsService.Verify(s => s.CheckAnalyticsAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>(), default), Times.Never);
    }

    [Fact]
    public async Task GetSummaryAsync_ShouldCallServiceAndSetCache_WhenCacheMiss()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        _cache.Setup(c => c.GetAsync<WorkspaceAnalyticsSummaryDto>(It.IsAny<string>(), default))
            .ReturnsAsync((WorkspaceAnalyticsSummaryDto?)null);
        
        var integrationId = Guid.NewGuid();
        _integrationRepo.Setup(r => r.GetByWorkspaceIdAsync(workspaceId))
            .ReturnsAsync(new List<Syncra.Domain.Entities.Integration> { 
                Syncra.Domain.Entities.Integration.Create(workspaceId, "x") 
            });
        
        _intAnalyticsService.Setup(s => s.CheckAnalyticsAsync(workspaceId, It.IsAny<Guid>(), 30, default))
            .ReturnsAsync(Result.Success(new List<AnalyticsData>()));

        _postRepo.Setup(r => r.GetAnalyticsDataAsync(workspaceId, null, default))
            .ReturnsAsync(new List<AnalyticsPostData>());

        // Act
        var result = await _service.GetSummaryAsync(workspaceId);

        // Assert
        Assert.True(result.IsSuccess);
        _cache.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<WorkspaceAnalyticsSummaryDto>(), null, It.IsAny<CancellationToken>()), Times.Once);
    }
}
