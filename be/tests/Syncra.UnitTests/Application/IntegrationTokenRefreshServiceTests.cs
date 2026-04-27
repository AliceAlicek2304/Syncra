using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Syncra.Application.Services;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;
using Xunit;

namespace Syncra.UnitTests.Application;

public class IntegrationTokenRefreshServiceTests
{
    private readonly Mock<IIntegrationRepository> _integrationRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<ISocialProvider> _providerMock = new();
    private readonly Mock<ILogger<IntegrationTokenRefreshService>> _loggerMock = new();

    private IntegrationTokenRefreshService CreateService(string providerId = "x")
    {
        _providerMock.SetupGet(p => p.ProviderId).Returns(providerId);

        return new IntegrationTokenRefreshService(
            _integrationRepositoryMock.Object,
            _unitOfWorkMock.Object,
            new[] { _providerMock.Object },
            _loggerMock.Object);
    }

    private Integration CreateIntegration(string refreshToken = "rt-1", DateTime? expiresAtUtc = null)
    {
        var integration = Integration.Create(
            workspaceId: Guid.NewGuid(),
            platform: "x",
            refreshToken: refreshToken,
            expiresAtUtc: expiresAtUtc ?? DateTime.UtcNow.AddMinutes(-1)
        );
        // Force Id for tracking
        integration.GetType().GetProperty("Id")?.SetValue(integration, Guid.NewGuid());
        return integration;
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_ShouldSkip_WhenMissingRefreshToken()
    {
        // Arrange
        var integration = CreateIntegration(refreshToken: null!);

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.TotalConsidered);
        Assert.Equal(1, result.SkippedNotEligible);
        Assert.Equal(0, result.Attempted);

        _providerMock.Verify(p => p.RefreshTokenAsync(It.IsAny<string>(), default), Times.Never);
        _integrationRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<Integration>()), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Never);
        Assert.Null(integration.TokenRefreshHealthStatus);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_ShouldSkip_WhenNeedsReauth()
    {
        // Arrange
        var integration = CreateIntegration();
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err1");
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err2");
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err3"); // 3 failures = NeedsReauth

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.SkippedNotEligible);
        Assert.Equal(0, result.Attempted);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_FirstFailure_ShouldMarkWarning()
    {
        // Arrange
        var integration = CreateIntegration();

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "unknown_error" }
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.Attempted);
        Assert.Equal(1, result.Failed);
        Assert.Equal(1, integration.TokenRefreshConsecutiveFailures);
        Assert.Equal(IntegrationRefreshHealthStatus.Warning, integration.TokenRefreshHealthStatus);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_SecondFailure_ShouldMarkError()
    {
        // Arrange
        var integration = CreateIntegration();
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err1"); // 1 failure = Warning

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "unknown_error" }
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(2, integration.TokenRefreshConsecutiveFailures);
        Assert.Equal(IntegrationRefreshHealthStatus.Error, integration.TokenRefreshHealthStatus);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_ThirdFailure_ShouldMarkNeedsReauth()
    {
        // Arrange
        var integration = CreateIntegration();
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err1");
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err2"); // 2 failures = Error

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "unknown_error" }
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(3, integration.TokenRefreshConsecutiveFailures);
        Assert.Equal(IntegrationRefreshHealthStatus.NeedsReauth, integration.TokenRefreshHealthStatus);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_TerminalError_ShouldMarkNeedsReauthImmediately()
    {
        // Arrange
        var integration = CreateIntegration();

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "invalid_grant" }
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, integration.TokenRefreshConsecutiveFailures);
        Assert.Equal(IntegrationRefreshHealthStatus.NeedsReauth, integration.TokenRefreshHealthStatus);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_Success_ShouldResetFailuresAndMarkOk()
    {
        // Arrange
        var integration = CreateIntegration();
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err1");
        integration.MarkTokenRefreshFailure(DateTime.UtcNow, "err2"); // 2 failures = Error

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = true,
                AccessToken = "at-new",
                RefreshToken = "rt-new",
                ExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.Refreshed);
        Assert.Equal(0, integration.TokenRefreshConsecutiveFailures);
        Assert.Equal(IntegrationRefreshHealthStatus.Ok, integration.TokenRefreshHealthStatus);
    }
}
