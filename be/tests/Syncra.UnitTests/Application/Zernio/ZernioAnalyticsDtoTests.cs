using Syncra.Application.DTOs.Zernio;
using Xunit;

namespace Syncra.UnitTests.Application.Zernio;

public class ZernioAnalyticsDtoTests
{
    [Fact]
    public void ZernioPostAnalyticsDto_ShouldExposeAllSpecFields()
    {
        var type = typeof(ZernioPostAnalyticsDto);
        var expected = new[]
        {
            "PostId", "LatePostId", "Status", "Content", "ScheduledFor", "PublishedAt",
            "Analytics", "PlatformAnalytics", "Platform", "PlatformPostUrl", "IsExternal",
            "SyncStatus", "Message", "ThumbnailUrl", "MediaType", "MediaItems", "SyncPending"
        };
        foreach (var name in expected)
        {
            Assert.NotNull(type.GetProperty(name));
        }
    }

    [Fact]
    public void ZernioPostAnalyticsDto_SyncPending_ShouldDeriveFromSyncStatus()
    {
        var pending = new ZernioPostAnalyticsDto(SyncStatus: "pending");
        var synced = new ZernioPostAnalyticsDto(SyncStatus: "synced");
        var unavailable = new ZernioPostAnalyticsDto(SyncStatus: "unavailable");
        var partial = new ZernioPostAnalyticsDto(SyncStatus: "partial");
        var none = new ZernioPostAnalyticsDto();

        Assert.True(pending.SyncPending);
        Assert.False(synced.SyncPending);
        Assert.False(unavailable.SyncPending);
        Assert.False(partial.SyncPending);
        Assert.False(none.SyncPending);
    }

    [Fact]
    public void ZernioPostAnalyticsDto_EmptyStaticFactory_HasZeroAnalytics()
    {
        var dto = ZernioPostAnalyticsDto.Empty;
        Assert.NotNull(dto.Analytics);
        Assert.Equal(0, dto.Analytics!.Impressions);
        Assert.False(dto.SyncPending);
    }

    [Fact]
    public void ZernioPlatformPostMetricsDto_ShouldExposeStatusAndSyncStatus()
    {
        var type = typeof(ZernioPlatformPostMetricsDto);
        Assert.NotNull(type.GetProperty("Status"));
        Assert.NotNull(type.GetProperty("SyncStatus"));
    }

    [Fact]
    public void ZernioPostMediaItemDto_ShouldExposeTypeUrlThumbnail()
    {
        var type = typeof(ZernioPostMediaItemDto);
        Assert.NotNull(type.GetProperty("Type"));
        Assert.NotNull(type.GetProperty("Url"));
        Assert.NotNull(type.GetProperty("Thumbnail"));
    }

    [Fact]
    public void ZernioAnalyticsOverviewDto_ShouldExposeDataStaleness()
    {
        var type = typeof(ZernioAnalyticsOverviewDto);
        Assert.NotNull(type.GetProperty("DataStaleness"));
    }

    [Fact]
    public void ZernioAnalyticsListPostDto_ShouldExposePlatformsNotPlatformAnalytics()
    {
        var type = typeof(ZernioAnalyticsListPostDto);
        Assert.NotNull(type.GetProperty("Platforms"));
        Assert.Null(type.GetProperty("PlatformAnalytics"));
    }

    [Fact]
    public void ZernioPostAnalyticsListDto_ShouldExposeAllTopLevelFields()
    {
        var type = typeof(ZernioPostAnalyticsListDto);
        var expected = new[]
        {
            "Overview", "Posts", "Pagination", "Accounts", "HasAnalyticsAccess"
        };
        foreach (var name in expected)
        {
            Assert.NotNull(type.GetProperty(name));
        }
    }

    [Fact]
    public void ZernioAnalyticsPaginationDto_ShouldExposeAllPaginationFields()
    {
        var type = typeof(ZernioAnalyticsPaginationDto);
        Assert.NotNull(type.GetProperty("Page"));
        Assert.NotNull(type.GetProperty("Limit"));
        Assert.NotNull(type.GetProperty("Total"));
        Assert.NotNull(type.GetProperty("Pages"));
    }

    [Fact]
    public void PostAnalyticsFields_ShouldExposeAllSpecFields()
    {
        var type = typeof(PostAnalyticsFields);
        var expected = new[]
        {
            "Impressions", "Reach", "Likes", "Comments", "Shares", "Saves",
            "Clicks", "Views", "EngagementRate", "LastUpdated"
        };
        foreach (var name in expected)
        {
            Assert.NotNull(type.GetProperty(name));
        }
    }
}
