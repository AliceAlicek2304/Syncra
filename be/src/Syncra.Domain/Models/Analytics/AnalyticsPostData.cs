using Syncra.Domain.Enums;

namespace Syncra.Domain.Models.Analytics;

public record AnalyticsPostData(
    Guid Id,
    PostStatus Status,
    DateTime? PublishedAtUtc
);
