using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MediatR;
using Moq;
using Syncra.Api.Controllers;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Api;

public class AnalyticsControllerTests
{
    private readonly Mock<IMediator> _mediatorMock = new();
    private readonly Mock<IZernioClient> _zernioClientMock = new();
    private readonly Mock<IZernioProfileRepository> _zernioProfileRepositoryMock = new();
    private readonly Mock<ILogger<AnalyticsController>> _loggerMock = new();

    private AnalyticsController CreateController()
    {
        return new AnalyticsController(
            _mediatorMock.Object,
            _zernioClientMock.Object,
            _zernioProfileRepositoryMock.Object,
            _loggerMock.Object);
    }

    [Fact]
    public async Task GetLinkedInAggregateAnalytics_WhenSuccessful_ReturnsOk()
    {
        // Arrange
        var accountId = "acc_123";
        var expectedResponse = new ZernioLinkedInAggregateAnalyticsResponseDto(
            AccountId: accountId,
            Platform: "linkedin",
            AccountType: "personal",
            Username: "John Doe",
            Aggregation: "TOTAL",
            DateRange: null,
            AnalyticsTotal: new ZernioLinkedInAggregateAnalyticsDataDto(
                Impressions: 100, Reach: 50, Reactions: 10, Comments: 5, Shares: 2, Saves: 1, Sends: 0, EngagementRate: 0.15m
            ),
            AnalyticsDaily: null,
            SkippedMetrics: null,
            Note: "Test note",
            LastUpdated: DateTime.UtcNow
        );

        _zernioClientMock
            .Setup(c => c.GetLinkedInAggregateAnalyticsAsync(
                accountId,
                It.IsAny<string>(),
                It.IsAny<DateOnly?>(),
                It.IsAny<DateOnly?>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        var controller = CreateController();

        // Act
        var result = await controller.GetLinkedInAggregateAnalytics(
            accountId,
            aggregation: "TOTAL",
            startDate: null,
            endDate: null,
            metrics: null,
            cancellationToken: CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<ZernioLinkedInAggregateAnalyticsResponseDto>(okResult.Value);
        Assert.Equal(accountId, dto.AccountId);
        Assert.Equal("linkedin", dto.Platform);
    }

    [Fact]
    public async Task GetLinkedInAggregateAnalytics_WhenBadRequestException_ReturnsBadRequest()
    {
        // Arrange
        var accountId = "acc_123";
        _zernioClientMock
            .Setup(c => c.GetLinkedInAggregateAnalyticsAsync(
                accountId,
                It.IsAny<string>(),
                It.IsAny<DateOnly?>(),
                It.IsAny<DateOnly?>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ZernioBadRequestException("Invalid params", errorCode: "invalid_params"));

        var controller = CreateController();

        // Act
        var result = await controller.GetLinkedInAggregateAnalytics(
            accountId,
            aggregation: "TOTAL",
            startDate: null,
            endDate: null,
            metrics: null,
            cancellationToken: CancellationToken.None);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        dynamic val = badRequestResult.Value;
        Assert.NotNull(val);
    }

    [Fact]
    public async Task GetLinkedInAggregateAnalytics_WhenBillingRequiredException_Returns402()
    {
        // Arrange
        var accountId = "acc_123";
        _zernioClientMock
            .Setup(c => c.GetLinkedInAggregateAnalyticsAsync(
                accountId,
                It.IsAny<string>(),
                It.IsAny<DateOnly?>(),
                It.IsAny<DateOnly?>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ZernioBillingRequiredException("Billing required", "billing_code", "http://billing"));

        var controller = CreateController();

        // Act
        var result = await controller.GetLinkedInAggregateAnalytics(
            accountId,
            aggregation: "TOTAL",
            startDate: null,
            endDate: null,
            metrics: null,
            cancellationToken: CancellationToken.None);

        // Assert
        var statusCodeResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(402, statusCodeResult.StatusCode);
    }
}
