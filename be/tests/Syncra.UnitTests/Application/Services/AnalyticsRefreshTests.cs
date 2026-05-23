using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.Features.Analytics.Queries;
using Syncra.Application.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Services;

public class AnalyticsRefreshTests
{
    private readonly Mock<IAnalyticsCache> _cache = new();
    private readonly Mock<ILogger<RefreshAnalyticsCommandHandler>> _logger = new();
    private readonly RefreshAnalyticsCommandHandler _handler;

    public AnalyticsRefreshTests()
    {
        _handler = new RefreshAnalyticsCommandHandler(
            _cache.Object,
            _logger.Object);
    }

    [Fact]
    public async Task Handle_ShouldDeleteAllPresetKeys_ForWorkspace()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var expectedZernioSummaryKeys = new[]
        {
            $"zernio:analytics:summary:{workspaceId}:7",
            $"zernio:analytics:summary:{workspaceId}:30",
            $"zernio:analytics:summary:{workspaceId}:90"
        };
        var expectedZernioHeatmapKeys = new[]
        {
            $"zernio:analytics:heatmap:{workspaceId}:7",
            $"zernio:analytics:heatmap:{workspaceId}:30",
            $"zernio:analytics:heatmap:{workspaceId}:90"
        };
        var expectedLegacySummaryKeys = new[]
        {
            $"analytics:summary:{workspaceId}:7",
            $"analytics:summary:{workspaceId}:30",
            $"analytics:summary:{workspaceId}:90"
        };
        var expectedLegacyHeatmapKeys = new[]
        {
            $"analytics:heatmap:{workspaceId}:7",
            $"analytics:heatmap:{workspaceId}:30",
            $"analytics:heatmap:{workspaceId}:90"
        };

        _cache.Setup(c => c.RemoveAsync(It.IsAny<string>(), default))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(
            new RefreshAnalyticsCommand(workspaceId),
            default);

        // Assert
        Assert.True(result.IsSuccess);

        // Verify all Zernio summary keys deleted
        foreach (var key in expectedZernioSummaryKeys)
            _cache.Verify(c => c.RemoveAsync(key, default), Times.Once);

        // Verify all Zernio heatmap keys deleted (prep for plan 02)
        foreach (var key in expectedZernioHeatmapKeys)
            _cache.Verify(c => c.RemoveAsync(key, default), Times.Once);

        // Verify all legacy summary keys deleted
        foreach (var key in expectedLegacySummaryKeys)
            _cache.Verify(c => c.RemoveAsync(key, default), Times.Once);

        // Verify all legacy heatmap keys deleted
        foreach (var key in expectedLegacyHeatmapKeys)
            _cache.Verify(c => c.RemoveAsync(key, default), Times.Once);

        // Verify total count (12 keys: 4 types × 3 presets)
        _cache.Verify(c => c.RemoveAsync(It.IsAny<string>(), default), Times.Exactly(12));
    }
}
