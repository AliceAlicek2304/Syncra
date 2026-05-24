namespace Syncra.Application.DTOs.Trends;

/// <summary>
/// A trending topic detected across social platforms.
/// </summary>
public sealed record TrendingTopic(
    string Id,
    string Topic,
    string Growth,
    string Category,
    string Volume,
    string Sentiment);

/// <summary>
/// A trending hashtag with growth data.
/// </summary>
public sealed record PopularHashtag(
    string Tag,
    string Growth,
    string Color);

/// <summary>
/// Result of a trends query for a workspace.
/// </summary>
public sealed record TrendsResult(
    IReadOnlyList<TrendingTopic> TrendingTopics,
    IReadOnlyList<PopularHashtag> PopularHashtags,
    string Tip);
