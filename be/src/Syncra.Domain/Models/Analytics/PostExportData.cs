namespace Syncra.Domain.Models.Analytics;

public record PostExportData(
    Guid Id,
    string TitlePreview,
    string? ContentPreview,
    DateTime PublishedAtUtc,
    string Platform,
    string Status
);
