using Moq;
using Syncra.Application.Features.Integrations.Commands;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Xunit;

namespace Syncra.UnitTests.Application.Integrations;

public class DisconnectIntegrationCommandHandlerTests
{
    private readonly Mock<IIntegrationRepository> _integrationRepositoryMock;
    private readonly DisconnectIntegrationCommandHandler _handler;

    public DisconnectIntegrationCommandHandlerTests()
    {
        _integrationRepositoryMock = new Mock<IIntegrationRepository>();
        _handler = new DisconnectIntegrationCommandHandler(_integrationRepositoryMock.Object);
    }

    [Fact]
    public async Task Handle_ExistingActiveIntegration_DisconnectsSuccessfully()
    {
        // Arrange
        var integrationId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        
        var integration = Integration.Create(
            workspaceId,
            ProviderType.Twitter,
            "access-token",
            "refresh-token",
            DateTime.UtcNow.AddHours(1),
            new Dictionary<string, object> { ["user_id"] = "12345" });

        var command = new DisconnectIntegrationCommand
        {
            IntegrationId = integrationId,
            WorkspaceId = workspaceId
        };

        _integrationRepositoryMock.Setup(r => r.GetByIdAsync(integrationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(integration);

        _integrationRepositoryMock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.True(result);
        _integrationRepositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_IntegrationNotFound_ReturnsFalse()
    {
        // Arrange
        var command = new DisconnectIntegrationCommand
        {
            IntegrationId = Guid.NewGuid(),
            WorkspaceId = Guid.NewGuid()
        };

        _integrationRepositoryMock.Setup(r => r.GetByIdAsync(command.IntegrationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Integration?)null);

        // Act
        var result = await _handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task Handle_AlreadyDisconnectedIntegration_ReturnsFalse()
    {
        // Arrange
        var integrationId = Guid.NewGuid();
        var workspaceId = Guid.NewGuid();
        
        var integration = Integration.Create(
            workspaceId,
            ProviderType.Twitter,
            "access-token",
            "refresh-token",
            DateTime.UtcNow.AddHours(1),
            new Dictionary<string, object> { ["user_id"] = "12345" });
        
        integration.Deactivate();

        var command = new DisconnectIntegrationCommand
        {
            IntegrationId = integrationId,
            WorkspaceId = workspaceId
        };

        _integrationRepositoryMock.Setup(r => r.GetByIdAsync(integrationId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(integration);

        // Act & Assert
        await Assert.ThrowsAsync<DomainException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }
}