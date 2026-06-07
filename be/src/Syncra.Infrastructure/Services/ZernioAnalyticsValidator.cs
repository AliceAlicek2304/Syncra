using System.Globalization;
using Syncra.Domain.Exceptions;

namespace Syncra.Infrastructure.Services;

public static class ZernioAnalyticsValidator
{
    public const int MinLimit = 1;
    public const int MaxLimit = 100;
    public const int MinPage = 1;
    public const int MaxDateRangeDays = 366;

    private static readonly HashSet<string> ValidSources = new(StringComparer.OrdinalIgnoreCase)
    {
        "all", "late", "external"
    };

    private static readonly HashSet<string> ValidSortBy = new(StringComparer.OrdinalIgnoreCase)
    {
        "date", "engagement", "impressions", "reach",
        "likes", "comments", "shares", "saves", "clicks", "views"
    };

    private static readonly HashSet<string> ValidOrder = new(StringComparer.OrdinalIgnoreCase)
    {
        "asc", "desc"
    };

    public static void Validate(
        string? postId,
        string? platform,
        string? profileId,
        string? accountId,
        string? source,
        DateOnly? fromDate,
        DateOnly? toDate,
        int? limit,
        int? page,
        string? sortBy,
        string? order)
    {
        ValidateId("postId", postId, allowNull: true);
        ValidateId("platform", platform, allowNull: true);
        ValidateId("profileId", profileId, allowNull: true);
        ValidateId("accountId", accountId, allowNull: true);

        ValidateEnum("source", source, ValidSources);
        ValidateEnum("sortBy", sortBy, ValidSortBy);
        ValidateEnum("order", order, ValidOrder);

        ValidateDate("fromDate", fromDate);
        ValidateDate("toDate", toDate);
        ValidateDateRange(fromDate, toDate);

        ValidateIntRange("limit", limit, MinLimit, MaxLimit);
        ValidateIntRange("page", page, MinPage, int.MaxValue);
    }

    public static void ValidateSinglePost(
        string postId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrWhiteSpace(postId))
        {
            throw new ZernioBadRequestException(
                "postId is required for single-post analytics lookup.",
                errorCode: "missing_post_id");
        }
        if (postId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"postId exceeds maximum length of 256 characters (was {postId.Length}).",
                errorCode: "post_id_too_long");
        }
    }

    public static void ValidateListRequest(
        string? platform,
        string? profileId,
        string? accountId,
        string? source,
        DateOnly? fromDate,
        DateOnly? toDate,
        int? limit,
        int? page,
        string? sortBy,
        string? order,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Validate(
            postId: null,
            platform: platform,
            profileId: profileId,
            accountId: accountId,
            source: source,
            fromDate: fromDate,
            toDate: toDate,
            limit: limit,
            page: page,
            sortBy: sortBy,
            order: order);
    }

    private static void ValidateId(string name, string? value, bool allowNull)
    {
        if (value is null) return;
        if (allowNull && string.IsNullOrWhiteSpace(value))
        {
            return;
        }
        if (value.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"{name} exceeds maximum length of 256 characters (was {value.Length}).",
                errorCode: $"{name.ToLowerInvariant()}_too_long");
        }
        if (value.Any(c => c < '\u0020' && c != '\t'))
        {
            throw new ZernioBadRequestException(
                $"{name} contains control characters.",
                errorCode: $"{name.ToLowerInvariant()}_invalid_chars");
        }
    }

    private static void ValidateEnum(string name, string? value, HashSet<string> allowed)
    {
        if (value is null) return;
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ZernioBadRequestException(
                $"{name} cannot be empty when provided.",
                errorCode: $"{name.ToLowerInvariant()}_empty");
        }
        if (!allowed.Contains(value))
        {
            throw new ZernioBadRequestException(
                $"{name} must be one of: {string.Join(", ", allowed)} (was '{value}').",
                errorCode: $"{name.ToLowerInvariant()}_invalid");
        }
    }

    private static void ValidateDate(string name, DateOnly? value)
    {
        if (value is null) return;
        var min = new DateOnly(2000, 1, 1);
        var max = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2));
        if (value < min || value > max)
        {
            throw new ZernioBadRequestException(
                $"{name} must be between {min:yyyy-MM-dd} and {max:yyyy-MM-dd} (was {value:yyyy-MM-dd}).",
                errorCode: $"{name.ToLowerInvariant()}_out_of_range");
        }
    }

    private static void ValidateDateRange(DateOnly? fromDate, DateOnly? toDate)
    {
        if (fromDate is null || toDate is null) return;
        if (fromDate > toDate)
        {
            throw new ZernioBadRequestException(
                $"fromDate ({fromDate:yyyy-MM-dd}) must be on or before toDate ({toDate:yyyy-MM-dd}).",
                errorCode: "date_range_inverted");
        }
        var span = toDate.Value.DayNumber - fromDate.Value.DayNumber;
        if (span > MaxDateRangeDays)
        {
            throw new ZernioBadRequestException(
                $"Date range from {fromDate:yyyy-MM-dd} to {toDate:yyyy-MM-dd} is {span} days; max is {MaxDateRangeDays}.",
                errorCode: "date_range_too_large");
        }
    }

    private static void ValidateIntRange(string name, int? value, int min, int max)
    {
        if (value is null) return;
        if (value < min || value > max)
        {
            throw new ZernioBadRequestException(
                $"{name} must be between {min.ToString(CultureInfo.InvariantCulture)} and {max.ToString(CultureInfo.InvariantCulture)} (was {value.Value.ToString(CultureInfo.InvariantCulture)}).",
                errorCode: $"{name.ToLowerInvariant()}_out_of_range");
        }
    }

    public static readonly HashSet<string> ValidGoogleBusinessMetrics = new(StringComparer.Ordinal)
    {
        "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
        "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
        "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
        "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
        "BUSINESS_CONVERSATIONS",
        "BUSINESS_DIRECTION_REQUESTS",
        "CALL_CLICKS",
        "WEBSITE_CLICKS",
        "BUSINESS_BOOKINGS",
        "BUSINESS_FOOD_ORDERS",
        "BUSINESS_FOOD_MENU_CLICKS"
    };

    public const int GoogleBusinessMaxRangeDays = 548; // 18 months

    public static void ValidateGoogleBusinessPerformance(
        string accountId,
        string? metrics,
        string? startDate,
        string? endDate,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for Google Business performance.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (!string.IsNullOrWhiteSpace(metrics))
        {
            var requested = metrics.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requested)
            {
                if (!ValidGoogleBusinessMetrics.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidGoogleBusinessMetrics)}",
                        errorCode: "invalid_metric");
                }
            }
        }

        DateOnly? start = DateOnly.TryParse(startDate, out var sVal) ? sVal : null;
        DateOnly? end = DateOnly.TryParse(endDate, out var eVal) ? eVal : null;

        ValidateDate("startDate", start);
        ValidateDate("endDate", end);

        if (start.HasValue && end.HasValue)
        {
            if (start.Value > end.Value)
            {
                throw new ZernioBadRequestException(
                    $"startDate ({start.Value:yyyy-MM-dd}) must be on or before endDate ({end.Value:yyyy-MM-dd}).",
                    errorCode: "date_range_inverted");
            }
            var span = end.Value.DayNumber - start.Value.DayNumber;
            if (span > GoogleBusinessMaxRangeDays)
            {
                throw new ZernioBadRequestException(
                    $"Date range from {start.Value:yyyy-MM-dd} to {end.Value:yyyy-MM-dd} is {span} days; max is {GoogleBusinessMaxRangeDays} (18 months).",
                    errorCode: "date_range_too_large");
            }
        }
    }

    private static readonly HashSet<string> ValidFacebookMetrics = new(StringComparer.Ordinal)
    {
        "page_media_view", "page_views_total", "page_post_engagements",
        "page_video_views", "page_video_view_time", "page_follows",
        "followers_gained", "followers_lost"
    };

    private static readonly HashSet<string> ValidMetricTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "total_value", "time_series"
    };

    public static readonly IReadOnlyList<string> ValidInstagramMetrics = new[]
    {
        "reach", "views", "accounts_engaged", "total_interactions",
        "comments", "likes", "saves", "shares", "replies", "reposts",
        "follows_and_unfollows", "profile_links_taps"
    };

    private static readonly HashSet<string> ValidInstagramMetricsSet =
        new(ValidInstagramMetrics, StringComparer.Ordinal);

    public static readonly IReadOnlyList<string> ValidInstagramFollowerHistoryMetrics = new[]
    {
        "follower_count", "followers_gained", "followers_lost"
    };

    private static readonly HashSet<string> ValidInstagramFollowerHistoryMetricsSet =
        new(ValidInstagramFollowerHistoryMetrics, StringComparer.Ordinal);

    public const string InstagramFollowerHistoryDefaultMetrics = "follower_count,followers_gained,followers_lost";

    public const string InstagramTimeSeriesOnlyMetric = "reach";

    public const int InstagramMaxRangeDays = 90;

    public const int InstagramFollowerHistoryMaxRangeDays = 89;

    public static void ValidateInstagramAccountInsights(
        string accountId,
        string? metrics,
        string? since,
        string? until,
        string? metricType,
        string? breakdown,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for Instagram account insights.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        var requestedMetrics = Array.Empty<string>();
        if (!string.IsNullOrWhiteSpace(metrics))
        {
            requestedMetrics = metrics
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requestedMetrics)
            {
                if (!ValidInstagramMetricsSet.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidInstagramMetrics)}",
                        errorCode: "invalid_metric",
                        details: new { validMetrics = ValidInstagramMetrics });
                }
            }
        }

        var effectiveMetricType = string.IsNullOrWhiteSpace(metricType) ? "total_value" : metricType;
        if (!ValidMetricTypes.Contains(effectiveMetricType))
        {
            throw new ZernioBadRequestException(
                "metricType must be 'total_value' or 'time_series'.",
                errorCode: "invalid_metric_type");
        }

        if (effectiveMetricType.Equals("time_series", StringComparison.OrdinalIgnoreCase))
        {
            var nonReach = requestedMetrics.Where(m =>
                !string.Equals(m, InstagramTimeSeriesOnlyMetric, StringComparison.Ordinal)).ToList();
            if (nonReach.Count > 0)
            {
                throw new ZernioBadRequestException(
                    $"metricType=time_series is only supported for the 'reach' metric. " +
                    $"Remove or switch to total_value: {string.Join(", ", nonReach)}",
                    errorCode: "time_series_unsupported_metric");
            }
        }

        var validBreakdowns = new[] { "media_product_type", "follow_type", "follower_type", "contact_button_type" };
        if (!string.IsNullOrWhiteSpace(breakdown))
        {
            if (!effectiveMetricType.Equals("total_value", StringComparison.OrdinalIgnoreCase))
            {
                throw new ZernioBadRequestException(
                    "breakdown is only supported when metricType=total_value.",
                    errorCode: "breakdown_requires_total_value");
            }
            if (!validBreakdowns.Contains(breakdown, StringComparer.Ordinal))
            {
                throw new ZernioBadRequestException(
                    $"Invalid breakdown '{breakdown}'. Allowed: {string.Join(", ", validBreakdowns)}",
                    errorCode: "invalid_breakdown",
                    details: new { validBreakdowns });
            }
        }

        DateOnly? sinceDate = DateOnly.TryParse(since, out var sVal) ? sVal : null;
        DateOnly? untilDate = DateOnly.TryParse(until, out var uVal) ? uVal : null;

        ValidateDate("since", sinceDate);
        ValidateDate("until", untilDate);

        if (sinceDate.HasValue && untilDate.HasValue)
        {
            if (sinceDate.Value > untilDate.Value)
            {
                throw new ZernioBadRequestException(
                    $"since ({sinceDate.Value:yyyy-MM-dd}) must be on or before until ({untilDate.Value:yyyy-MM-dd}).",
                    errorCode: "date_range_inverted");
            }
            var span = untilDate.Value.DayNumber - sinceDate.Value.DayNumber;
            if (span > InstagramMaxRangeDays)
            {
                throw new ZernioBadRequestException(
                    $"Date range from {sinceDate.Value:yyyy-MM-dd} to {untilDate.Value:yyyy-MM-dd} is {span} days; max is {InstagramMaxRangeDays}.",
                    errorCode: "date_range_too_large");
            }
        }
    }

    public static void ValidateFacebookPageInsights(
        string accountId,
        string? metrics,
        string? since,
        string? until,
        string? metricType,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for Facebook page insights.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (!string.IsNullOrWhiteSpace(metrics))
        {
            var requested = metrics.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requested)
            {
                if (!ValidFacebookMetrics.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidFacebookMetrics)}",
                        errorCode: "invalid_metric");
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(metricType) && !ValidMetricTypes.Contains(metricType))
        {
            throw new ZernioBadRequestException(
                "metricType must be 'total_value' or 'time_series'.",
                errorCode: "invalid_metric_type");
        }

        DateOnly? sinceDate = DateOnly.TryParse(since, out var sVal) ? sVal : null;
        DateOnly? untilDate = DateOnly.TryParse(until, out var uVal) ? uVal : null;

        ValidateDate("since", sinceDate);
        ValidateDate("until", untilDate);

        if (sinceDate.HasValue && untilDate.HasValue && sinceDate.Value > untilDate.Value)
        {
            throw new ZernioBadRequestException(
                $"since ({sinceDate.Value:yyyy-MM-dd}) must be on or before until ({untilDate.Value:yyyy-MM-dd}).",
                errorCode: "date_range_inverted");
        }
    }

    public static void ValidateInstagramFollowerHistory(
        string accountId,
        string? metrics,
        string? since,
        string? until,
        string? metricType,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for Instagram follower history.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (!string.IsNullOrWhiteSpace(metrics))
        {
            var requested = metrics
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requested)
            {
                if (!ValidInstagramFollowerHistoryMetricsSet.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidInstagramFollowerHistoryMetrics)}",
                        errorCode: "invalid_metric",
                        details: new { validMetrics = ValidInstagramFollowerHistoryMetrics });
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(metricType) && !ValidMetricTypes.Contains(metricType))
        {
            throw new ZernioBadRequestException(
                "metricType must be 'total_value' or 'time_series'.",
                errorCode: "invalid_metric_type");
        }

        DateOnly? sinceDate = DateOnly.TryParse(since, out var sVal) ? sVal : null;
        DateOnly? untilDate = DateOnly.TryParse(until, out var uVal) ? uVal : null;

        ValidateDate("since", sinceDate);
        ValidateDate("until", untilDate);

        if (sinceDate.HasValue && untilDate.HasValue)
        {
            if (sinceDate.Value > untilDate.Value)
            {
                throw new ZernioBadRequestException(
                    $"since ({sinceDate.Value:yyyy-MM-dd}) must be on or before until ({untilDate.Value:yyyy-MM-dd}).",
                    errorCode: "date_range_inverted");
            }
            var span = untilDate.Value.DayNumber - sinceDate.Value.DayNumber;
            if (span > InstagramFollowerHistoryMaxRangeDays)
            {
                throw new ZernioBadRequestException(
                    $"Date range from {sinceDate.Value:yyyy-MM-dd} to {untilDate.Value:yyyy-MM-dd} is {span} days; max is {InstagramFollowerHistoryMaxRangeDays}.",
                    errorCode: "date_range_too_large");
            }
        }
    }

    public static readonly IReadOnlyList<string> ValidYouTubeMetrics = new[]
    {
        "views", "estimatedMinutesWatched", "subscribersGained", "subscribersLost"
    };

    private static readonly HashSet<string> ValidYouTubeMetricsSet =
        new(ValidYouTubeMetrics, StringComparer.Ordinal);

    public const string YouTubeDefaultMetrics = "views,estimatedMinutesWatched,subscribersGained,subscribersLost";

    public const int YouTubeMaxRangeDays = 365;

    public static void ValidateYouTubeChannelInsights(
        string accountId,
        string? metrics,
        string? since,
        string? until,
        string? metricType,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for YouTube channel insights.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (!string.IsNullOrWhiteSpace(metrics))
        {
            var requested = metrics.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requested)
            {
                if (!ValidYouTubeMetricsSet.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidYouTubeMetrics)}",
                        errorCode: "invalid_metric",
                        details: new { validMetrics = ValidYouTubeMetrics });
                }
            }
        }

        if (!string.IsNullOrWhiteSpace(metricType) && !ValidMetricTypes.Contains(metricType))
        {
            throw new ZernioBadRequestException(
                "metricType must be 'total_value' or 'time_series'.",
                errorCode: "invalid_metric_type");
        }

        DateOnly? sinceDate = DateOnly.TryParse(since, out var sVal) ? sVal : null;
        DateOnly? untilDate = DateOnly.TryParse(until, out var uVal) ? uVal : null;

        ValidateDate("since", sinceDate);
        ValidateDate("until", untilDate);

        if (sinceDate.HasValue && untilDate.HasValue)
        {
            if (sinceDate.Value > untilDate.Value)
            {
                throw new ZernioBadRequestException(
                    $"since ({sinceDate.Value:yyyy-MM-dd}) must be on or before until ({untilDate.Value:yyyy-MM-dd}).",
                    errorCode: "date_range_inverted");
            }
            var span = untilDate.Value.DayNumber - sinceDate.Value.DayNumber;
            if (span > YouTubeMaxRangeDays)
            {
                throw new ZernioBadRequestException(
                    $"Date range from {sinceDate.Value:yyyy-MM-dd} to {untilDate.Value:yyyy-MM-dd} is {span} days; max is {YouTubeMaxRangeDays}.",
                    errorCode: "date_range_too_large");
            }
        }
    }

    private static readonly System.Text.RegularExpressions.Regex YearMonthRegex =
        new(@"^\d{4}-\d{2}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    private static readonly System.Text.RegularExpressions.Regex LinkedInUrnRegex =
        new(@"^urn:li:(share|ugcPost):\w+$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public static void ValidateGoogleBusinessSearchKeywords(
        string accountId,
        string? startMonth,
        string? endMonth,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for Google Business search keywords.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (!string.IsNullOrWhiteSpace(startMonth) && !YearMonthRegex.IsMatch(startMonth))
        {
            throw new ZernioBadRequestException(
                "Invalid startMonth format. Use YYYY-MM.",
                errorCode: "invalid_start_month_format");
        }

        if (!string.IsNullOrWhiteSpace(endMonth) && !YearMonthRegex.IsMatch(endMonth))
        {
            throw new ZernioBadRequestException(
                "Invalid endMonth format. Use YYYY-MM.",
                errorCode: "invalid_end_month_format");
        }

        if (!string.IsNullOrWhiteSpace(startMonth) && !string.IsNullOrWhiteSpace(endMonth))
        {
            // Compare lexicographically — YYYY-MM format sorts correctly
            if (string.Compare(startMonth, endMonth, StringComparison.Ordinal) > 0)
            {
                throw new ZernioBadRequestException(
                    $"startMonth ({startMonth}) must be on or before endMonth ({endMonth}).",
                    errorCode: "date_range_inverted");
            }

            // Validate 18-month max range
            if (DateTime.TryParseExact(startMonth, "yyyy-MM", null,
                    System.Globalization.DateTimeStyles.None, out var start) &&
                DateTime.TryParseExact(endMonth, "yyyy-MM", null,
                    System.Globalization.DateTimeStyles.None, out var end))
            {
                var totalMonths = (end.Year - start.Year) * 12 + (end.Month - start.Month);
                if (totalMonths > 18)
                {
                    throw new ZernioBadRequestException(
                        $"Date range from {startMonth} to {endMonth} is {totalMonths} months; max is 18.",
                        errorCode: "date_range_too_large");
                }
            }
        }
    }

    public static readonly HashSet<string> ValidLinkedInAggregateMetrics = new(StringComparer.OrdinalIgnoreCase)
    {
        "IMPRESSION", "MEMBERS_REACHED", "REACTION", "COMMENT", "RESHARE", "POST_SAVE", "POST_SEND"
    };

    public static readonly IReadOnlyList<string> ValidLinkedInOrgMetrics = new[]
    {
        "impressions", "reach", "engagement", "reactions", "comments", "shares", "saves", "sends", "clicks", "views"
    };

    private static readonly HashSet<string> ValidLinkedInOrgMetricsSet =
        new(ValidLinkedInOrgMetrics, StringComparer.Ordinal);

    public const string LinkedInOrgDefaultMetrics = "impressions,reach,engagement,reactions,comments,shares,saves";
    public const int LinkedInOrgMaxRangeDays = 365;

    public static void ValidateLinkedInOrgAggregateAnalytics(
        string accountId,
        string? metrics,
        DateOnly? since,
        DateOnly? until,
        string? metricType,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for LinkedIn Org aggregate analytics.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (!string.IsNullOrWhiteSpace(metrics))
        {
            var requested = metrics.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requested)
            {
                if (!ValidLinkedInOrgMetricsSet.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidLinkedInOrgMetrics)}",
                        errorCode: "invalid_metric",
                        details: new { validMetrics = ValidLinkedInOrgMetrics });
                }
            }
        }

        var effectiveMetricType = string.IsNullOrWhiteSpace(metricType) ? "total_value" : metricType;
        if (!ValidMetricTypes.Contains(effectiveMetricType))
        {
            throw new ZernioBadRequestException(
                "metricType must be 'total_value' or 'time_series'.",
                errorCode: "invalid_metric_type");
        }

        ValidateDate("since", since);
        ValidateDate("until", until);

        if (since.HasValue && until.HasValue)
        {
            if (since.Value > until.Value)
            {
                throw new ZernioBadRequestException(
                    $"since ({since.Value:yyyy-MM-dd}) must be on or before until ({until.Value:yyyy-MM-dd}).",
                    errorCode: "date_range_inverted");
            }
            var span = until.Value.DayNumber - since.Value.DayNumber;
            if (span > LinkedInOrgMaxRangeDays)
            {
                throw new ZernioBadRequestException(
                    $"Date range from {since.Value:yyyy-MM-dd} to {until.Value:yyyy-MM-dd} is {span} days; max is {LinkedInOrgMaxRangeDays}.",
                    errorCode: "date_range_too_large");
            }
        }
    }

    public static void ValidateLinkedInPostReactions(
        string accountId,
        string urn,
        int? limit,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for LinkedIn post reactions.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        if (string.IsNullOrWhiteSpace(urn))
        {
            throw new ZernioBadRequestException(
                "urn is required for LinkedIn post reactions.",
                errorCode: "missing_urn");
        }
        if (!LinkedInUrnRegex.IsMatch(urn))
        {
            throw new ZernioBadRequestException(
                "urn must be a valid LinkedIn URN (e.g., urn:li:share:abc123 or urn:li:ugcPost:abc123).",
                errorCode: "invalid_urn");
        }

        if (limit.HasValue)
        {
            ValidateIntRange("limit", limit, MinLimit, MaxLimit);
        }
    }

    public static void ValidateLinkedInAggregateAnalytics(
        string accountId,
        string? aggregation,
        DateOnly? startDate,
        DateOnly? endDate,
        string? metrics,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (string.IsNullOrWhiteSpace(accountId))
        {
            throw new ZernioBadRequestException(
                "accountId is required for LinkedIn aggregate analytics.",
                errorCode: "missing_account_id");
        }
        if (accountId.Length > 256)
        {
            throw new ZernioBadRequestException(
                $"accountId exceeds maximum length of 256 characters (was {accountId.Length}).",
                errorCode: "account_id_too_long");
        }

        var allowedAggregation = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "TOTAL", "DAILY" };
        if (!string.IsNullOrWhiteSpace(aggregation) && !allowedAggregation.Contains(aggregation))
        {
            throw new ZernioBadRequestException(
                "Invalid aggregation type. Must be one of: TOTAL, DAILY",
                errorCode: "invalid_aggregation",
                details: new { validOptions = new[] { "TOTAL", "DAILY" } });
        }

        ValidateDate("startDate", startDate);
        ValidateDate("endDate", endDate);

        if (startDate.HasValue && endDate.HasValue && startDate.Value > endDate.Value)
        {
            throw new ZernioBadRequestException(
                $"startDate ({startDate.Value:yyyy-MM-dd}) must be on or before endDate ({endDate.Value:yyyy-MM-dd}).",
                errorCode: "date_range_inverted");
        }

        if (!string.IsNullOrWhiteSpace(metrics))
        {
            var requested = metrics.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var m in requested)
            {
                if (!ValidLinkedInAggregateMetrics.Contains(m))
                {
                    throw new ZernioBadRequestException(
                        $"Invalid metric '{m}'. Allowed: {string.Join(", ", ValidLinkedInAggregateMetrics)}",
                        errorCode: "invalid_metric",
                        details: new { validMetrics = ValidLinkedInAggregateMetrics.ToArray() });
                }
            }
        }

        if (string.Equals(aggregation, "DAILY", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.IsNullOrWhiteSpace(metrics))
            {
                var requested = metrics.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (requested.Any(m => string.Equals(m, "MEMBERS_REACHED", StringComparison.OrdinalIgnoreCase)))
                {
                    throw new ZernioBadRequestException(
                        "MEMBERS_REACHED metric is not supported with DAILY aggregation.",
                        errorCode: "members_reached_daily_unsupported");
                }
            }
        }
    }
}
