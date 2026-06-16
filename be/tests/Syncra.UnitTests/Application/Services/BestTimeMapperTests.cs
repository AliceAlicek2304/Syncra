using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Application.Services;
using Xunit;

namespace Syncra.UnitTests.Application.Services;

/// <summary>
/// Tests that Zernio best-time UTC slots map to HeatmapSlotDto
/// with DayOfWeek and Hour unchanged (no timezone conversion, D-01/D-02).
/// </summary>
public class BestTimeMapperTests
{
    private readonly Mock<IZernioClient> _zernioClientMock = new();
    private readonly Mock<IZernioProfileRepository> _profileRepoMock = new();
    private readonly Mock<ISocialAccountRepository> _socialAccountRepoMock = new();
    private readonly Mock<IAnalyticsCache> _cacheMock = new();
    private readonly Mock<ILogger<ZernioWorkspaceAnalyticsService>> _loggerMock = new();
    private readonly ZernioWorkspaceAnalyticsService _service;

    public BestTimeMapperTests()
    {
        _service = new ZernioWorkspaceAnalyticsService(
            _zernioClientMock.Object,
            _profileRepoMock.Object,
            _socialAccountRepoMock.Object,
            _cacheMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetHeatmapAsync_UtcSlotsPassThroughUnchanged()
    {
        // Arrange — workspace with Zernio profile
        var workspaceId = Guid.NewGuid();
        var profile = ZernioProfile.Create(
            workspaceId, "zernio_profile_1", "Test Profile", "zernio");

        _profileRepoMock.Setup(r => r.GetActiveByWorkspaceIdAsync(workspaceId))
            .ReturnsAsync(new List<ZernioProfile> { profile });

        // Cache miss
        _cacheMock.Setup(c => c.GetAsync<HeatmapDto>(
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((HeatmapDto?)null);

        // Zernio returns Sunday 23:00 UTC slot with avg_engagement 510.3
        var zernioSlots = new List<ZernioBestTimeSlotDto>
        {
            new(DayOfWeek: 6, Hour: 23, AvgEngagement: 510.3, PostCount: 15),
            new(DayOfWeek: 0, Hour: 9, AvgEngagement: 342.5, PostCount: 12),
            new(DayOfWeek: 4, Hour: 12, AvgEngagement: 289.1, PostCount: 8),
        };

        _zernioClientMock.Setup(c => c.GetBestTimeAsync(
                profile.ZernioProfileId, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioBestTimeDto(zernioSlots));

        // Act
        var result = await _service.GetHeatmapAsync(workspaceId, 90, cancellationToken: default);

        // Assert
        Assert.True(result.IsSuccess);
        var slots = result.Value.Slots;
        Assert.Equal(3, slots.Count);

        // Slot 1: Sunday 23 UTC → DayOfWeek 6, Hour 23 (unchanged)
        Assert.Equal(6, slots[0].DayOfWeek);
        Assert.Equal(23, slots[0].Hour);
        Assert.Equal(510, slots[0].Score);

        // Slot 2: Monday 9 UTC → DayOfWeek 0, Hour 9 (unchanged)
        Assert.Equal(0, slots[1].DayOfWeek);
        Assert.Equal(9, slots[1].Hour);
        Assert.Equal(343, slots[1].Score);

        // Slot 3: Thursday 12 UTC → DayOfWeek 4, Hour 12 (unchanged)
        Assert.Equal(4, slots[2].DayOfWeek);
        Assert.Equal(12, slots[2].Hour);
        Assert.Equal(289, slots[2].Score);
    }

    [Fact]
    public async Task GetHeatmapAsync_PlatformFiltered_ReturnsDifferentSlots()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var profile = ZernioProfile.Create(
            workspaceId, "zernio_profile_2", "Test Profile", "zernio");

        _profileRepoMock.Setup(r => r.GetActiveByWorkspaceIdAsync(workspaceId))
            .ReturnsAsync(new List<ZernioProfile> { profile });

        _cacheMock.Setup(c => c.GetAsync<HeatmapDto>(
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((HeatmapDto?)null);

        // All-platform result
        var allSlots = new List<ZernioBestTimeSlotDto>
        {
            new(DayOfWeek: 0, Hour: 10, AvgEngagement: 200, PostCount: 5),
            new(DayOfWeek: 0, Hour: 14, AvgEngagement: 150, PostCount: 3),
        };

        // Instagram-only result (different slots)
        var instagramSlots = new List<ZernioBestTimeSlotDto>
        {
            new(DayOfWeek: 0, Hour: 18, AvgEngagement: 300, PostCount: 8),
        };

        _zernioClientMock.Setup(c => c.GetBestTimeAsync(
                profile.ZernioProfileId, null, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioBestTimeDto(allSlots));

        _zernioClientMock.Setup(c => c.GetBestTimeAsync(
                profile.ZernioProfileId, "instagram", null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ZernioBestTimeDto(instagramSlots));

        // Act — all platforms
        var resultAll = await _service.GetHeatmapAsync(workspaceId, 90, cancellationToken: default);

        // Act — instagram only
        var resultInsta = await _service.GetHeatmapAsync(workspaceId, 90, "instagram", default);

        // Assert — different results for different platform queries
        Assert.True(resultAll.IsSuccess);
        Assert.True(resultInsta.IsSuccess);
        Assert.Equal(2, resultAll.Value.Slots.Count);
        Assert.Single(resultInsta.Value.Slots);
        Assert.Equal(18, resultInsta.Value.Slots[0].Hour);
    }

    /// <summary>
    /// When cache is hit, returns cached data without calling Zernio.
    /// </summary>
    [Fact]
    public async Task GetHeatmapAsync_CacheHit_ReturnsCachedSlots()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var cachedSlots = new List<HeatmapSlotDto>
        {
            new(DayOfWeek: 2, Hour: 15, Score: 100),
        };

        _cacheMock.Setup(c => c.GetAsync<HeatmapDto>(
                It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HeatmapDto(cachedSlots));

        // Act
        var result = await _service.GetHeatmapAsync(workspaceId, 30, cancellationToken: default);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Single(result.Value.Slots);
        Assert.Equal(15, result.Value.Slots[0].Hour);

        // Verify no Zernio call was made
        _zernioClientMock.Verify(c => c.GetBestTimeAsync(
            It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
