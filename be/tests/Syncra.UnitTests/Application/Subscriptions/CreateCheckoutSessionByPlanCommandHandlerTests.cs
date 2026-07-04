using Moq;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class CreateCheckoutSessionByPlanCommandHandlerTests
{
    [Fact]
    public async Task Resolves_plan_by_PlanCode_and_uses_StripePriceId()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var planRepositoryMock = new Mock<IPlanRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();
        var billingVoucherServiceMock = new Mock<IBillingVoucherService>();
        var providerMock = new Mock<IPaymentProvider>();

        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Code = "pro", IsActive = true, StripeMonthlyPriceId = "price_123" };

        workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);
        planRepositoryMock.Setup(x => x.GetByCodeAsync("pro", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        resolverMock.Setup(x => x.GetDefaultProviderKey()).Returns("stripe");
        resolverMock.Setup(x => x.GetRequiredProvider("stripe")).Returns(providerMock.Object);
        billingVoucherServiceMock
            .Setup(x => x.ResolveDiscountAsync(ownerId, plan, "month", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync((PaymentDiscount?)null);

        PaymentCheckoutSessionRequest? capturedRequest = null;
        providerMock
            .Setup(x => x.CreateCheckoutSessionAsync(It.IsAny<PaymentCheckoutSessionRequest>(), It.IsAny<CancellationToken>()))
            .Callback<PaymentCheckoutSessionRequest, CancellationToken>((request, _) => capturedRequest = request)
            .ReturnsAsync(new PaymentCheckoutSessionResult("sess_1", "https://checkout", "cus_1", workspace.Id.ToString()));

        var sut = new CreateCheckoutSessionByPlanCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            planRepositoryMock.Object,
            resolverMock.Object,
            billingVoucherServiceMock.Object);

        var result = await sut.Handle(
            new CreateCheckoutSessionByPlanCommand(workspace.Id, ownerId, "pro", "month", null, null),
            CancellationToken.None);

        Assert.Equal("https://checkout", result.CheckoutUrl);
        Assert.NotNull(capturedRequest);
        Assert.Equal("price_123", capturedRequest!.PriceId);
    }

    [Fact]
    public async Task Fails_when_plan_missing_or_inactive()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var planRepositoryMock = new Mock<IPlanRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();
        var billingVoucherServiceMock = new Mock<IBillingVoucherService>();

        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);
        resolverMock.Setup(x => x.GetDefaultProviderKey()).Returns("stripe");
        planRepositoryMock.Setup(x => x.GetByCodeAsync("missing", It.IsAny<CancellationToken>())).ReturnsAsync((Plan?)null);

        var sut = new CreateCheckoutSessionByPlanCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            planRepositoryMock.Object,
            resolverMock.Object,
            billingVoucherServiceMock.Object);

        await Assert.ThrowsAsync<DomainException>(() =>
            sut.Handle(new CreateCheckoutSessionByPlanCommand(workspace.Id, ownerId, "missing", "month", null, null), CancellationToken.None));
    }

    [Fact]
    public async Task Throws_forbidden_when_user_is_not_workspace_owner()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var planRepositoryMock = new Mock<IPlanRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();
        var billingVoucherServiceMock = new Mock<IBillingVoucherService>();

        var ownerId = Guid.NewGuid();
        var nonOwnerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");

        workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);

        var sut = new CreateCheckoutSessionByPlanCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            planRepositoryMock.Object,
            resolverMock.Object,
            billingVoucherServiceMock.Object);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            sut.Handle(new CreateCheckoutSessionByPlanCommand(workspace.Id, nonOwnerId, "pro", "month", null, null), CancellationToken.None));

        Assert.Equal("forbidden", exception.Code);
        Assert.Contains("Only the workspace owner can manage billing.", exception.Message);
    }

    [Fact]
    public async Task Throws_plan_removed_when_student_plan_is_requested()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var planRepositoryMock = new Mock<IPlanRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();
        var billingVoucherServiceMock = new Mock<IBillingVoucherService>();

        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Id = Guid.NewGuid(), Code = "STUDENT", IsActive = true };

        workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);
        planRepositoryMock.Setup(x => x.GetByCodeAsync("STUDENT", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        resolverMock.Setup(x => x.GetDefaultProviderKey()).Returns("sepay");

        var sut = new CreateCheckoutSessionByPlanCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            planRepositoryMock.Object,
            resolverMock.Object,
            billingVoucherServiceMock.Object);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            sut.Handle(new CreateCheckoutSessionByPlanCommand(workspace.Id, ownerId, "STUDENT", "month", null, null), CancellationToken.None));

        Assert.Equal("plan_removed", exception.Code);
    }

    [Fact]
    public async Task Throws_plan_removed_even_when_student_email_is_verified()
    {
        var workspaceRepositoryMock = new Mock<IWorkspaceRepository>();
        var subscriptionRepositoryMock = new Mock<ISubscriptionRepository>();
        var planRepositoryMock = new Mock<IPlanRepository>();
        var resolverMock = new Mock<IPaymentProviderResolver>();
        var billingVoucherServiceMock = new Mock<IBillingVoucherService>();

        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Id = Guid.NewGuid(), Code = "STUDENT", IsActive = true };

        workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);
        planRepositoryMock.Setup(x => x.GetByCodeAsync("STUDENT", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        resolverMock.Setup(x => x.GetDefaultProviderKey()).Returns("sepay");

        var sut = new CreateCheckoutSessionByPlanCommandHandler(
            workspaceRepositoryMock.Object,
            subscriptionRepositoryMock.Object,
            planRepositoryMock.Object,
            resolverMock.Object,
            billingVoucherServiceMock.Object);

        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            sut.Handle(new CreateCheckoutSessionByPlanCommand(workspace.Id, ownerId, "STUDENT", "month", null, null), CancellationToken.None));

        Assert.Equal("plan_removed", exception.Code);
    }
}
