using Moq;
using Syncra.Application.Repositories;
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

    private IntegrationTokenRefreshService CreateService(string providerId = "x")
    {
        _providerMock.SetupGet(p => p.ProviderId).Returns(providerId);

        return new IntegrationTokenRefreshService(
            _integrationRepositoryMock.Object,
            _unitOfWorkMock.Object,
            new[] { _providerMock.Object });
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_ShouldSkip_WhenMissingRefreshToken()
    {
        // Arrange
        var integration = new Integration
        {
            Id = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Platform = "x",
            IsActive = true,
            RefreshToken = null,
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1)
        };

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
    public async Task RefreshExpiringIntegrationsAsync_ShouldRefresh_WhenExpiringSoon()
    {
        // Arrange
        var integration = new Integration
        {
            Id = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Platform = "x",
            IsActive = true,
            RefreshToken = "rt-1",
            AccessToken = "at-old",
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(2)
        };

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = true,
                AccessToken = "at-new",
                RefreshToken = "rt-2",
                ExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.Attempted);
        Assert.Equal(1, result.Refreshed);
        Assert.Equal(0, result.Failed);

        Assert.Equal("at-new", integration.AccessToken);
        Assert.Equal("rt-2", integration.RefreshToken);
        Assert.NotNull(integration.ExpiresAtUtc);
        Assert.Equal(IntegrationRefreshHealthStatus.Ok, integration.TokenRefreshHealthStatus);
        Assert.Null(integration.TokenRefreshLastError);
        Assert.NotNull(integration.TokenRefreshLastAttemptAtUtc);
        Assert.NotNull(integration.TokenRefreshLastSuccessAtUtc);

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_ShouldSkip_WhenNotExpiring()
    {
        // Arrange
        var integration = new Integration
        {
            Id = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Platform = "x",
            IsActive = true,
            RefreshToken = "rt-1",
            ExpiresAtUtc = DateTime.UtcNow.AddHours(1)
        };

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.SkippedNotExpiring);
        Assert.Equal(0, result.Attempted);

        _providerMock.Verify(p => p.RefreshTokenAsync(It.IsAny<string>(), default), Times.Never);
        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Never);
        Assert.Null(integration.TokenRefreshHealthStatus);
    }

    [Fact]
    public async Task RefreshExpiringIntegrationsAsync_ShouldMarkFailure_WhenProviderReturnsError()
    {
        // Arrange
        var integration = new Integration
        {
            Id = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid(),
            Platform = "x",
            IsActive = true,
            RefreshToken = "rt-1",
            AccessToken = "at-old",
            ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1)
        };

        _integrationRepositoryMock
            .Setup(r => r.GetAllAsync())
            .ReturnsAsync(new[] { integration });

        _providerMock
            .Setup(p => p.RefreshTokenAsync("rt-1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AuthResult
            {
                IsSuccess = false,
                Error = new ProviderError { Code = "invalid_grant", Message = "Refresh token expired" }
            });

        var sut = CreateService();

        // Act
        var result = await sut.RefreshExpiringIntegrationsAsync();

        // Assert
        Assert.Equal(1, result.Attempted);
        Assert.Equal(0, result.Refreshed);
        Assert.Equal(1, result.Failed);

        Assert.Equal("at-old", integration.AccessToken);
        Assert.Equal(IntegrationRefreshHealthStatus.Error, integration.TokenRefreshHealthStatus);
        Assert.Contains("invalid_grant", integration.TokenRefreshLastError);
        Assert.Contains("Refresh token expired", integration.TokenRefreshLastError);
        Assert.NotNull(integration.TokenRefreshLastAttemptAtUtc);

        _unitOfWorkMock.Verify(u => u.SaveChangesAsync(default), Times.Once);
    }
}

