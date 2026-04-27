using System;
using System.Threading;
using System.Threading.Tasks;
using Moq;
using Syncra.Application.Features.Integrations.Queries;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application;

public class GetIntegrationHealthQueryHandlerTests
{
    private readonly Mock<IIntegrationRepository> _integrationRepositoryMock = new();

    private GetIntegrationHealthQueryHandler CreateHandler()
    {
        return new GetIntegrationHealthQueryHandler(_integrationRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ShouldReturnNull_WhenIntegrationNotFound()
    {
        // Arrange
        var query = new GetIntegrationHealthQuery(Guid.NewGuid(), "x");
        _integrationRepositoryMock
            .Setup(r => r.GetByWorkspaceAndPlatformAsync(query.WorkspaceId, query.ProviderId))
            .ReturnsAsync((Integration?)null);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Null(result);
    }

    [Theory]
    [InlineData(false, false, IntegrationRefreshHealthStatus.Ok, "disconnected")] // inactive overrides all
    [InlineData(false, true, IntegrationRefreshHealthStatus.NeedsReauth, "disconnected")]
    [InlineData(true, true, IntegrationRefreshHealthStatus.Ok, "token_expired")] // token_expired overrides health status
    [InlineData(true, true, IntegrationRefreshHealthStatus.NeedsReauth, "token_expired")]
    [InlineData(true, false, IntegrationRefreshHealthStatus.NeedsReauth, "needs_reauth")] // needs_reauth overrides error
    [InlineData(true, false, IntegrationRefreshHealthStatus.Error, "error")] // error overrides warning
    [InlineData(true, false, IntegrationRefreshHealthStatus.Warning, "warning")] // warning overrides ok
    [InlineData(true, false, IntegrationRefreshHealthStatus.Ok, "ok")] // ok fallback
    [InlineData(true, false, null, "ok")] // null fallback
    public async Task Handle_ShouldReturnCorrectStatus_BasedOnPrecedence(
        bool isActive, 
        bool isTokenExpired, 
        IntegrationRefreshHealthStatus? healthStatus, 
        string expectedStatus)
    {
        // Arrange
        var query = new GetIntegrationHealthQuery(Guid.NewGuid(), "x");
        
        var integration = Integration.Create(
            workspaceId: query.WorkspaceId,
            platform: query.ProviderId,
            expiresAtUtc: isTokenExpired ? DateTime.UtcNow.AddMinutes(-10) : DateTime.UtcNow.AddMinutes(10)
        );

        // Force Id for tracking
        integration.GetType().GetProperty("Id")?.SetValue(integration, Guid.NewGuid());
        
        if (!isActive)
        {
            integration.Deactivate();
        }

        if (healthStatus == IntegrationRefreshHealthStatus.Warning)
        {
            integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err"); // 1 failure -> Warning
        }
        else if (healthStatus == IntegrationRefreshHealthStatus.Error)
        {
            integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err");
            integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err"); // 2 failures -> Error
        }
        else if (healthStatus == IntegrationRefreshHealthStatus.NeedsReauth)
        {
            integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err");
            integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err");
            integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err"); // 3 failures -> NeedsReauth
        }
        else if (healthStatus == IntegrationRefreshHealthStatus.Ok)
        {
            integration.MarkTokenRefreshSuccess(DateTime.UtcNow);
        }

        _integrationRepositoryMock
            .Setup(r => r.GetByWorkspaceAndPlatformAsync(query.WorkspaceId, query.ProviderId))
            .ReturnsAsync(integration);

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedStatus, result.Status);
    }
}
