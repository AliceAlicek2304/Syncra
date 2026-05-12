namespace Syncra.Application.DTOs.Analytics;

public record PostExportDto(
    Guid Id,
    string TitlePreview,
    string? ContentPreview,
    DateTime PublishedAtUtc,
    string Platform,
    string Status
);

public record ExportSummaryRowDto(
    string Metric,
    string Value
);

public record ExportHeatmapRowDto(
    int DayOfWeek,
    int Hour,
    int Score
);

public record AnalyticsExportDocument(
    IReadOnlyList<ExportSummaryRowDto> SummaryMetrics,
    IReadOnlyList<ExportHeatmapRowDto> HeatmapSlots,
    IReadOnlyList<PostExportDto> Posts
);
