using System.Threading;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.Interfaces;
using Syncra.Infrastructure.Jobs;
using Xunit;

namespace Syncra.UnitTests.Application;

public class IntegrationTokenRefreshJobTests
{
    [Fact]
    public async Task ExecuteAsync_ShouldInvokeRefreshService()
    {
        // Arrange
        var refreshServiceMock = new Mock<IIntegrationTokenRefreshService>();
        var loggerMock = new Mock<ILogger<IntegrationTokenRefreshJob>>();

        refreshServiceMock
            .Setup(s => s.RefreshExpiringIntegrationsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RefreshIntegrationTokensResult(
                TotalConsidered: 1,
                SkippedNotEligible: 0,
                SkippedNotExpiring: 0,
                Attempted: 1,
                Refreshed: 1,
                Failed: 0));

        var job = new IntegrationTokenRefreshJob(refreshServiceMock.Object, loggerMock.Object);

        // Act
        await job.ExecuteAsync(CancellationToken.None);

        // Assert
        refreshServiceMock.Verify(
            s => s.RefreshExpiringIntegrationsAsync(It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public void Scheduler_ShouldNotThrow_WhenConfiguringRecurringJob()
    {
        // Arrange
        var recurringJobManagerMock = new Mock<IRecurringJobManager>();
        var loggerMock = new Mock<ILogger<IntegrationTokenRefreshJobScheduler>>();

        var scheduler = new IntegrationTokenRefreshJobScheduler(
            recurringJobManagerMock.Object,
            loggerMock.Object);

        // Act & Assert
        var exception = Record.Exception(() => scheduler.ScheduleRecurringJob());
        Assert.Null(exception);
    }
}

