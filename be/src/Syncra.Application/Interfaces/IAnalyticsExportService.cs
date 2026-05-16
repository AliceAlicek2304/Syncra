using Syncra.Domain.Common;

namespace Syncra.Application.Interfaces;

public interface IAnalyticsExportService
{
    Task<Result<byte[]>> ExportCsvAsync(
        Guid workspaceId,
        DateTime startUtc,
        DateTime endUtc,
        CancellationToken cancellationToken = default);
}
