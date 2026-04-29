using Moq;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
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

        var workspace = Workspace.Create(Guid.NewGuid(), "Acme", "acme");
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

        var result = await sut.Handle(new CreatePortalSessionCommand(workspace.Id, null), CancellationToken.None);

        Assert.Equal("https://portal", result.PortalUrl);
        resolverMock.Verify(x => x.GetRequiredProvider("stripe"), Times.Once);
    }
}
