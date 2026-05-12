using MediatR;
using Moq;
using Syncra.Application.Features.Analytics.Queries;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Xunit;

namespace Syncra.UnitTests.Application.Analytics;

public class GetAnalyticsExportQueryHandlerTests
{
    private readonly Mock<IAnalyticsExportService> _exportService = new();
    private readonly GetAnalyticsExportQueryHandler _handler;

    public GetAnalyticsExportQueryHandlerTests()
    {
        _handler = new GetAnalyticsExportQueryHandler(_exportService.Object);
    }

    [Fact]
    public async Task Handle_WithDaysMinusOne_ShouldCalculateYTD()
    {
        var now = DateTime.UtcNow;
        var workspaceId = Guid.NewGuid();
        var query = new GetAnalyticsExportQuery(workspaceId, Days: -1, null, null);
        _exportService
            .Setup(s => s.ExportCsvAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<byte[]>.Success(Array.Empty<byte>()));

        var result = await _handler.Handle(query, default);

        Assert.True(result.IsSuccess);
        _exportService.Verify(s => s.ExportCsvAsync(
            workspaceId,
            It.Is<DateTime>(d => d.Year == now.Year && d.Month == 1 && d.Day == 1 && d.Kind == DateTimeKind.Utc),
            It.Is<DateTime>(d => d.Date == now.Date && d.Kind == DateTimeKind.Utc),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithDays7_ShouldCalculateLast7Days()
    {
        var now = DateTime.UtcNow;
        var workspaceId = Guid.NewGuid();
        var query = new GetAnalyticsExportQuery(workspaceId, Days: 7, null, null);
        _exportService
            .Setup(s => s.ExportCsvAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<byte[]>.Success(Array.Empty<byte>()));

        await _handler.Handle(query, default);

        _exportService.Verify(s => s.ExportCsvAsync(
            workspaceId,
            It.Is<DateTime>(d => (now - d).TotalDays <= 7.001 && (now - d).TotalDays >= 6.999),
            It.Is<DateTime>(d => d.Date == now.Date),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithCustomDates_ShouldUseProvidedRange()
    {
        var workspaceId = Guid.NewGuid();
        var start = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 3, 31, 23, 59, 59, DateTimeKind.Utc);
        var query = new GetAnalyticsExportQuery(workspaceId, null, start, end);
        _exportService
            .Setup(s => s.ExportCsvAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<byte[]>.Success(Array.Empty<byte>()));

        await _handler.Handle(query, default);

        _exportService.Verify(s => s.ExportCsvAsync(workspaceId, start, end, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WithNoDates_ShouldDefaultTo30Days()
    {
        var now = DateTime.UtcNow;
        var workspaceId = Guid.NewGuid();
        var query = new GetAnalyticsExportQuery(workspaceId, null, null, null);
        _exportService
            .Setup(s => s.ExportCsvAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<byte[]>.Success(Array.Empty<byte>()));

        await _handler.Handle(query, default);

        _exportService.Verify(s => s.ExportCsvAsync(
            workspaceId,
            It.Is<DateTime>(d => (now - d).TotalDays <= 30.001 && (now - d).TotalDays >= 29.999),
            It.Is<DateTime>(d => d.Date == now.Date),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_DaysTakesPrecedenceOverCustomDates()
    {
        var now = DateTime.UtcNow;
        var workspaceId = Guid.NewGuid();
        var query = new GetAnalyticsExportQuery(workspaceId, Days: 90,
            StartUtc: new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndUtc: new DateTime(2025, 12, 31, 0, 0, 0, DateTimeKind.Utc));
        _exportService
            .Setup(s => s.ExportCsvAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<byte[]>.Success(Array.Empty<byte>()));

        await _handler.Handle(query, default);

        _exportService.Verify(s => s.ExportCsvAsync(
            workspaceId,
            It.Is<DateTime>(d => (now - d).TotalDays <= 90.001 && (now - d).TotalDays >= 89.999),
            It.IsAny<DateTime>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_WhenServiceFails_ReturnsFailure()
    {
        var workspaceId = Guid.NewGuid();
        var query = new GetAnalyticsExportQuery(workspaceId, 30, null, null);
        _exportService
            .Setup(s => s.ExportCsvAsync(It.IsAny<Guid>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<byte[]>.Failure("Export failed"));

        var result = await _handler.Handle(query, default);

        Assert.True(result.IsFailure);
        Assert.Equal("Export failed", result.Error);
    }
}
