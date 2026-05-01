using Moq;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class CreatePortalSessionCommandHandlerTests
{
    [Fact]
    public async Task Existing_subscription_with_Provider_stripe_uses_stripe_provider()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();
        var providerMock = new Mock<IPaymentProvider>();

        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        subscriptionRepositoryMock
            .Setup(x => x.GetByWorkspaceIdAsync(workspace.Id))
            .ReturnsAsync(new Subscription { Provider = "stripe" });
        workspaceRepositoryMock
            .Setup(x => x.GetByIdAsync(workspace.Id))
            .ReturnsAsync(workspace);
        resolverMock.Setup(x => x.GetRequiredProvider("stripe")).Returns(providerMock.Object);
        providerMock
            .Setup(x => x.CreatePortalSessionAsync(It.IsAny<PaymentPortalSessionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentPortalSessionResult("https://portal"));

        var sut = new CreatePortalSessionCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            resolverMock.Object);

        var result = await sut.Handle(new CreatePortalSessionCommand(workspace.Id, ownerId, null), CancellationToken.None);

        Assert.Equal("https://portal", result.PortalUrl);
        resolverMock.Verify(x => x.GetRequiredProvider("stripe"), Times.Once);
    }

    [Fact]
    public async Task Throws_forbidden_when_user_is_not_workspace_owner()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();

        var ownerId = Guid.NewGuid();
        var nonOwnerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");

        workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);

        var sut = new CreatePortalSessionCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            resolverMock.Object);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            sut.Handle(new CreatePortalSessionCommand(workspace.Id, nonOwnerId, null), CancellationToken.None));

        Assert.Equal("forbidden", exception.Code);
        Assert.Contains("Only the workspace owner can manage billing.", exception.Message);
    }
}
