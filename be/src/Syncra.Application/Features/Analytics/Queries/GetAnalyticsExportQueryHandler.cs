using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetAnalyticsExportQueryHandler
    : IRequestHandler<GetAnalyticsExportQuery, Result<byte[]>>
{
    private readonly IAnalyticsExportService _exportService;

    public GetAnalyticsExportQueryHandler(IAnalyticsExportService exportService)
    {
        _exportService = exportService;
    }

    public async Task<Result<byte[]>> Handle(
        GetAnalyticsExportQuery request,
        CancellationToken cancellationToken)
    {
        var (startUtc, endUtc) = ResolveDateRange(request);

        return await _exportService.ExportCsvAsync(
            request.WorkspaceId,
            startUtc,
            endUtc,
            cancellationToken);
    }

    internal static (DateTime StartUtc, DateTime EndUtc) ResolveDateRange(GetAnalyticsExportQuery query)
    {
        var now = DateTime.UtcNow;

        if (query.Days.HasValue)
        {
            var endUtc = now;
            var startUtc = query.Days.Value switch
            {
                -1 => new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                _ => now.AddDays(-query.Days.Value)
            };
            return (startUtc, endUtc);
        }

        var end = query.EndUtc ?? now;
        var start = query.StartUtc ?? now.AddDays(-30);
        return (start, end);
    }
}
