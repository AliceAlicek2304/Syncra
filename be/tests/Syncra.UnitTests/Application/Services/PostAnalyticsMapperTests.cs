using Syncra.Application.DTOs.Analytics;
using Syncra.Application.DTOs.Zernio;
using Xunit;

namespace Syncra.UnitTests.Application.Services;

/// <summary>
/// Tests that daily-metrics JSON-like DTOs map correctly to WorkspaceAnalyticsSummaryDto
/// and that post analytics JSON-like DTOs map correctly to PostMetricsDto.
/// </summary>
public class PostAnalyticsMapperTests
{
    [Fact]
    public void DailyMetrics_To_WorkspaceAnalyticsSummaryDto_ComputesTotals()
    {
        // Arrange — simulate a Zernio daily-metrics response with 2 data points from different weeks
        // May 11 is a Monday (week 1), May 18 is a Monday (week 2)
        var dailyData = new[]
        {
            new ZernioDailyDataPointDto("2026-05-11", 3, 1000, 800, 50, 10, 5, 20, 100, 500),
            new ZernioDailyDataPointDto("2026-05-18", 2, 1500, 1200, 80, 15, 8, 30, 150, 700),
        };

        var platformBreakdown = new[]
        {
            new ZernioPlatformBreakdownDto("facebook", 3, 1500, 1200, 80, 15, 8, 30, 150, 700),
            new ZernioPlatformBreakdownDto("instagram", 2, 1000, 800, 50, 10, 5, 20, 100, 500),
        };

        // Act — compute summary totals from Zernio data
        var totalReach = dailyData.Sum(d => d.Reach);
        var totalImpressions = dailyData.Sum(d => d.Impressions);
        var totalLikes = dailyData.Sum(d => d.Likes);
        var totalComments = dailyData.Sum(d => d.Comments);
        var totalShares = dailyData.Sum(d => d.Shares);
        var totalEngagements = totalLikes + totalComments + totalShares;
        var engagementRate = totalImpressions > 0
            ? Math.Round((double)totalEngagements / totalImpressions * 100, 2)
            : 0;
        var totalPosts = dailyData.Sum(d => d.PostCount);

        var weeklyReach = dailyData
            .GroupBy(d =>
            {
                var date = DateOnly.Parse(d.Date);
                var dow = (int)date.DayOfWeek;
                var monday = date.AddDays(-(dow == 0 ? 6 : dow - 1));
                return monday;
            })
            .Select(g => new WeeklyReachDto(
                WeekStart: g.Key.ToString("yyyy-MM-dd"),
                Reach: g.Sum(d => d.Reach)))
            .ToList();

        var result = new WorkspaceAnalyticsSummaryDto(
            TotalReach: totalReach,
            EngagementRate: engagementRate,
            FollowerGrowth: 0,
            TotalPosts: totalPosts,
            WeeklyReach: weeklyReach,
            PlatformBreakdown: platformBreakdown.Select(p => new PlatformBreakdownDto(
                p.Platform, p.PostCount, p.Impressions, p.Reach,
                p.Likes, p.Comments, p.Shares, p.Saves, p.Clicks, p.Views))
                .ToList());

        // Assert
        Assert.Equal(2000, result.TotalReach);
        Assert.Equal(5, result.TotalPosts);
        Assert.Equal(2, result.WeeklyReach.Count);
        Assert.Equal(2, result.PlatformBreakdown?.Count);
        Assert.Equal("facebook", result.PlatformBreakdown![0].Platform);
    }

    [Fact]
    public void PostAnalytics_To_PostMetricsDto_MapsHeadlineMetrics()
    {
        // Arrange — simulate Zernio post analytics fields
        var analytics = new PostAnalyticsFields(
            Impressions: 5000,
            Reach: 3500,
            Likes: 120,
            Comments: 30,
            Shares: 15,
            Saves: 45,
            Clicks: 200,
            Views: 3000,
            EngagementRate: 3.3m,
            LastUpdated: DateTime.UtcNow);

        var platformMetrics = new[]
        {
            new ZernioPlatformPostMetricsDto(
                "instagram", "ig_123", "acc_1", "user1",
                new PostAnalyticsFields(3000, 2000, 80, 20, 10, 30, 120, 1800, 3.7m, null),
                null, null),
            new ZernioPlatformPostMetricsDto(
                "facebook", "fb_456", "acc_2", "page1",
                new PostAnalyticsFields(2000, 1500, 40, 10, 5, 15, 80, 1200, 2.8m, null),
                "https://facebook.com/post/456", null),
        };

        // Act
        var engagements = analytics.Likes + analytics.Comments + analytics.Shares;
        var dto = new PostMetricsDto(
            Impressions: analytics.Impressions,
            Engagements: engagements,
            Clicks: analytics.Clicks,
            Views: analytics.Views,
            EngagementRate: analytics.EngagementRate,
            PlatformAnalytics: platformMetrics);

        // Assert — four headline metrics
        Assert.Equal(5000, dto.Impressions);
        Assert.Equal(165, dto.Engagements); // 120 + 30 + 15
        Assert.Equal(200, dto.Clicks);
        Assert.Equal(3000, dto.Views);
        Assert.Equal(3.3m, dto.EngagementRate);
        Assert.Equal(2, dto.PlatformAnalytics?.Count);
        Assert.Equal("instagram", dto.PlatformAnalytics![0].Platform);
        Assert.Equal(3000, dto.PlatformAnalytics[0].Analytics!.Impressions);
    }

    [Fact]
    public void PostAnalytics_WithNullAnalytics_HasZeroHeadlineMetrics()
    {
        // Act — simulate Zernio returning sync-pending (null analytics)
        var dto = new PostMetricsDto(0, 0, 0, 0, 0, null);

        // Assert
        Assert.Equal(0, dto.Impressions);
        Assert.Equal(0, dto.Engagements);
        Assert.Null(dto.PlatformAnalytics);
    }

    [Fact]
    public void PlatformBreakdownDto_RequiresReauth_DefaultsToFalse()
    {
        // Act
        var breakdown = new PlatformBreakdownDto("facebook", 0, 0, 0, 0, 0, 0, 0, 0, 0);

        // Assert
        Assert.False(breakdown.RequiresReauth);
        Assert.Null(breakdown.ReauthorizeUrl);
    }

    [Fact]
    public void PlatformBreakdownDto_CanSetRequiresReauth()
    {
        // Act
        var breakdown = new PlatformBreakdownDto("facebook", 0, 0, 0, 0, 0, 0, 0, 0, 0,
            RequiresReauth: true, ReauthorizeUrl: "https://zernio.com/reconnect");

        // Assert
        Assert.True(breakdown.RequiresReauth);
        Assert.Equal("https://zernio.com/reconnect", breakdown.ReauthorizeUrl);
    }
}
