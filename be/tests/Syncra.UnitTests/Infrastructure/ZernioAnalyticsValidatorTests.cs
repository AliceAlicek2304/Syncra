using Syncra.Domain.Exceptions;
using Syncra.Infrastructure.Services;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class ZernioAnalyticsValidatorTests
{
    [Theory]
    [InlineData("all")]
    [InlineData("late")]
    [InlineData("external")]
    [InlineData("ALL")]
    public void Validate_ShouldAcceptValidSources(string source)
    {
        var ex = Record.Exception(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: source,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: null,
            order: null));
        Assert.Null(ex);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("internal")]
    public void Validate_ShouldRejectInvalidSources(string source)
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: source,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: null,
            order: null));
        Assert.Equal("source_invalid", ex.ErrorCode);
    }

    [Fact]
    public void Validate_ShouldRejectEmptySourceWithEmptyCode()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: "",
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: null,
            order: null));
        Assert.Equal("source_empty", ex.ErrorCode);
    }

    [Theory]
    [InlineData("date")]
    [InlineData("engagement")]
    [InlineData("impressions")]
    [InlineData("reach")]
    [InlineData("likes")]
    [InlineData("comments")]
    [InlineData("shares")]
    [InlineData("saves")]
    [InlineData("clicks")]
    [InlineData("views")]
    public void Validate_ShouldAcceptValidSortBy(string sortBy)
    {
        var ex = Record.Exception(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: sortBy,
            order: null));
        Assert.Null(ex);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("time")]
    public void Validate_ShouldRejectInvalidSortBy(string sortBy)
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: sortBy,
            order: null));
        Assert.Equal("sortby_invalid", ex.ErrorCode);
    }

    [Theory]
    [InlineData("asc")]
    [InlineData("desc")]
    [InlineData("DESC")]
    public void Validate_ShouldAcceptValidOrder(string order)
    {
        var ex = Record.Exception(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: null,
            order: order));
        Assert.Null(ex);
    }

    [Theory]
    [InlineData("ASCENDING")]
    [InlineData("down")]
    public void Validate_ShouldRejectInvalidOrder(string order)
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: null,
            page: null,
            sortBy: null,
            order: order));
        Assert.Equal("order_invalid", ex.ErrorCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    [InlineData(int.MaxValue)]
    public void Validate_ShouldRejectOutOfRangeLimit(int limit)
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: limit,
            page: null,
            sortBy: null,
            order: null));
        Assert.Equal("limit_out_of_range", ex.ErrorCode);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    [InlineData(100)]
    public void Validate_ShouldAcceptValidLimit(int limit)
    {
        var ex = Record.Exception(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: limit,
            page: null,
            sortBy: null,
            order: null));
        Assert.Null(ex);
    }

    [Fact]
    public void Validate_ShouldRejectPageLessThanOne()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: null,
            toDate: null,
            limit: null,
            page: 0,
            sortBy: null,
            order: null));
        Assert.Equal("page_out_of_range", ex.ErrorCode);
    }

    [Fact]
    public void Validate_ShouldRejectInvertedDateRange()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: new DateOnly(2024, 6, 1),
            toDate: new DateOnly(2024, 5, 1),
            limit: null,
            page: null,
            sortBy: null,
            order: null));
        Assert.Equal("date_range_inverted", ex.ErrorCode);
    }

    [Fact]
    public void Validate_ShouldRejectRangeLargerThanMaxDays()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: new DateOnly(2023, 1, 1),
            toDate: new DateOnly(2024, 1, 3),
            limit: null,
            page: null,
            sortBy: null,
            order: null));
        Assert.Equal("date_range_too_large", ex.ErrorCode);
    }

    [Fact]
    public void Validate_ShouldAcceptRangeAtMaxDays()
    {
        var ex = Record.Exception(() => ZernioAnalyticsValidator.Validate(
            postId: null,
            platform: null,
            profileId: null,
            accountId: null,
            source: null,
            fromDate: new DateOnly(2024, 1, 1),
            toDate: new DateOnly(2025, 1, 1),
            limit: null,
            page: null,
            sortBy: null,
            order: null));
        Assert.Null(ex);
    }

    [Fact]
    public void ValidateSinglePost_ShouldRejectEmptyPostId()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateSinglePost(string.Empty, default));
        Assert.Equal("missing_post_id", ex.ErrorCode);
    }

    [Fact]
    public void ValidateSinglePost_ShouldRejectWhitespacePostId()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateSinglePost("   ", default));
        Assert.Equal("missing_post_id", ex.ErrorCode);
    }

    [Fact]
    public void ValidateSinglePost_ShouldRejectTooLongPostId()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateSinglePost(new string('a', 257), default));
        Assert.Equal("post_id_too_long", ex.ErrorCode);
    }

    [Fact]
    public void ValidateSinglePost_ShouldAcceptValidPostId()
    {
        var ex = Record.Exception(() =>
            ZernioAnalyticsValidator.ValidateSinglePost("zernio_post_123", default));
        Assert.Null(ex);
    }

    [Fact]
    public void ValidateListRequest_ShouldAcceptAllNulls()
    {
        var ex = Record.Exception(() =>
            ZernioAnalyticsValidator.ValidateListRequest(
                platform: null,
                profileId: null,
                accountId: null,
                source: null,
                fromDate: null,
                toDate: null,
                limit: null,
                page: null,
                sortBy: null,
                order: null,
                cancellationToken: default));
        Assert.Null(ex);
    }

    [Fact]
    public void ValidateListRequest_ShouldThrowOnCancellation()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        Assert.Throws<OperationCanceledException>(() =>
            ZernioAnalyticsValidator.ValidateListRequest(
                platform: null,
                profileId: null,
                accountId: null,
                source: null,
                fromDate: null,
                toDate: null,
                limit: null,
                page: null,
                sortBy: null,
                order: null,
                cancellationToken: cts.Token));
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldThrowIfAccountIdMissing()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: "",
                aggregation: "TOTAL",
                startDate: null,
                endDate: null,
                metrics: null,
                cancellationToken: default));
        Assert.Equal("missing_account_id", ex.ErrorCode);
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldThrowIfAccountIdTooLong()
    {
        var longAccountId = new string('a', 257);
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: longAccountId,
                aggregation: "TOTAL",
                startDate: null,
                endDate: null,
                metrics: null,
                cancellationToken: default));
        Assert.Equal("account_id_too_long", ex.ErrorCode);
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldThrowIfInvalidAggregation()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: "123456",
                aggregation: "INVALID",
                startDate: null,
                endDate: null,
                metrics: null,
                cancellationToken: default));
        Assert.Equal("invalid_aggregation", ex.ErrorCode);
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldThrowIfInvertedDates()
    {
        var start = new System.DateOnly(2025, 6, 6);
        var end = new System.DateOnly(2025, 6, 5);
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: "123456",
                aggregation: "TOTAL",
                startDate: start,
                endDate: end,
                metrics: null,
                cancellationToken: default));
        Assert.Equal("date_range_inverted", ex.ErrorCode);
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldThrowIfInvalidMetrics()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: "123456",
                aggregation: "TOTAL",
                startDate: null,
                endDate: null,
                metrics: "IMPRESSION,INVALID_METRIC",
                cancellationToken: default));
        Assert.Equal("invalid_metric", ex.ErrorCode);
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldThrowIfMembersReachedWithDaily()
    {
        var ex = Assert.Throws<ZernioBadRequestException>(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: "123456",
                aggregation: "DAILY",
                startDate: null,
                endDate: null,
                metrics: "IMPRESSION,MEMBERS_REACHED",
                cancellationToken: default));
        Assert.Equal("members_reached_daily_unsupported", ex.ErrorCode);
    }

    [Fact]
    public void ValidateLinkedInAggregateAnalytics_ShouldPassWithValidParams()
    {
        var start = new System.DateOnly(2025, 6, 1);
        var end = new System.DateOnly(2025, 6, 5);
        var ex = Record.Exception(() =>
            ZernioAnalyticsValidator.ValidateLinkedInAggregateAnalytics(
                accountId: "123456",
                aggregation: "DAILY",
                startDate: start,
                endDate: end,
                metrics: "IMPRESSION,REACTION",
                cancellationToken: default));
        Assert.Null(ex);
    }
}
