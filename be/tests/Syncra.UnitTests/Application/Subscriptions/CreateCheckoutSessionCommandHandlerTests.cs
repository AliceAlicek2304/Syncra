using Moq;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class CreateCheckoutSessionCommandHandlerTests
{
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock = new();
    private readonly Mock<ISubscriptionRepository> _subscriptionRepositoryMock = new();
    private readonly Mock<IPaymentProviderResolver> _paymentProviderResolverMock = new();
    private readonly Mock<IPaymentProvider> _paymentProviderMock = new();

    [Fact]
    public async Task Uses_existing_subscription_provider_when_available()
    {
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var subscription = new Subscription { Provider = "stripe" };

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync(subscription);
        _paymentProviderResolverMock.Setup(x => x.GetRequiredProvider("stripe")).Returns(_paymentProviderMock.Object);
        _paymentProviderMock
            .Setup(x => x.CreateCheckoutSessionAsync(It.IsAny<PaymentCheckoutSessionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentCheckoutSessionResult("sess_1", "https://checkout", "cus_1", workspace.Id.ToString()));

        var sut = new CreateCheckoutSessionCommandHandler(
            _workspaceRepositoryMock.Object,
            _subscriptionRepositoryMock.Object,
            _paymentProviderResolverMock.Object);

        var result = await sut.Handle(new CreateCheckoutSessionCommand(workspace.Id, ownerId, "price_1", null, null), CancellationToken.None);

        Assert.Equal("https://checkout", result.CheckoutUrl);
        _paymentProviderResolverMock.Verify(x => x.GetRequiredProvider("stripe"), Times.Once);
    }

    [Fact]
    public async Task Uses_workspace_BillingProvider_when_subscription_missing()
    {
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        workspace.SetBillingIdentity("stripe", "cus_ws_1");

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);
        _paymentProviderResolverMock.Setup(x => x.GetRequiredProvider("stripe")).Returns(_paymentProviderMock.Object);
        _paymentProviderMock
            .Setup(x => x.CreateCheckoutSessionAsync(It.IsAny<PaymentCheckoutSessionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentCheckoutSessionResult("sess_2", "https://checkout-2", "cus_ws_1", workspace.Id.ToString()));

        var sut = new CreateCheckoutSessionCommandHandler(
            _workspaceRepositoryMock.Object,
            _subscriptionRepositoryMock.Object,
            _paymentProviderResolverMock.Object);

        await sut.Handle(new CreateCheckoutSessionCommand(workspace.Id, ownerId, "price_2", null, null), CancellationToken.None);

        _paymentProviderResolverMock.Verify(x => x.GetRequiredProvider("stripe"), Times.Once);
    }

    [Fact]
    public async Task Falls_back_to_GetDefaultProviderKey_when_subscription_and_workspace_provider_missing()
    {
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);
        _paymentProviderResolverMock.Setup(x => x.GetDefaultProviderKey()).Returns("stripe");
        _paymentProviderResolverMock.Setup(x => x.GetRequiredProvider("stripe")).Returns(_paymentProviderMock.Object);
        _paymentProviderMock
            .Setup(x => x.CreateCheckoutSessionAsync(It.IsAny<PaymentCheckoutSessionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaymentCheckoutSessionResult("sess_3", "https://checkout-3", null, workspace.Id.ToString()));

        var sut = new CreateCheckoutSessionCommandHandler(
            _workspaceRepositoryMock.Object,
            _subscriptionRepositoryMock.Object,
            _paymentProviderResolverMock.Object);

        await sut.Handle(new CreateCheckoutSessionCommand(workspace.Id, ownerId, "price_3", null, null), CancellationToken.None);

        _paymentProviderResolverMock.Verify(x => x.GetDefaultProviderKey(), Times.Once);
    }

    [Fact]
    public async Task Throws_forbidden_when_user_is_not_workspace_owner()
    {
        var ownerId = Guid.NewGuid();
        var nonOwnerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);

        var sut = new CreateCheckoutSessionCommandHandler(
            _workspaceRepositoryMock.Object,
            _subscriptionRepositoryMock.Object,
            _paymentProviderResolverMock.Object);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            sut.Handle(new CreateCheckoutSessionCommand(workspace.Id, nonOwnerId, "price_1", null, null), CancellationToken.None));

        Assert.Equal("forbidden", exception.Code);
        Assert.Contains("Only the workspace owner can manage billing.", exception.Message);
    }
}
