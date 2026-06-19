using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Application.Payments.Handlers;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Syncra.Infrastructure.Services;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class SePayTests
{
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock = new();
    private readonly Mock<ISubscriptionRepository> _subscriptionRepositoryMock = new();
    private readonly Mock<IPlanRepository> _planRepositoryMock = new();
    private readonly Mock<IDistributedCache> _cacheMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();
    private readonly Mock<ILogger<SePayPaymentProvider>> _loggerMock = new();
    private readonly IOptions<SePayOptions> _sePayOptions;

    public SePayTests()
    {
        var options = new SePayOptions
        {
            AccountNumber = "1017588888",
            BankCode = "Vietinbank",
            AccountName = "CONG TY CO PHAN SYNCRA",
            WebhookSecret = "test_secret"
        };
        _sePayOptions = Microsoft.Extensions.Options.Options.Create(options);
    }



    [Fact]
    public async Task CreateCheckoutSession_Caches_PendingPayment_When_Not_Eligible()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var planId = Guid.NewGuid();
        var workspace = Workspace.Create(Guid.NewGuid(), "Test Workspace", "test");
        var plan = new Plan { Id = planId, Code = "PRO", PriceMonthly = 149000, PriceYearly = 1190000, IsActive = true };
        
        var existingSub = new Subscription 
        { 
            WorkspaceId = workspaceId, 
            PlanId = Guid.NewGuid(), 
            TrialEndsAtUtc = DateTime.UtcNow.AddDays(-1) // Used trial
        };

        _planRepositoryMock.Setup(r => r.GetByIdAsync(planId, It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        _subscriptionRepositoryMock.Setup(r => r.GetByWorkspaceIdAsync(workspaceId)).ReturnsAsync(existingSub);

        var provider = new SePayPaymentProvider(
            _sePayOptions,
            _workspaceRepositoryMock.Object,
            _subscriptionRepositoryMock.Object,
            _planRepositoryMock.Object,
            _cacheMock.Object,
            _unitOfWorkMock.Object,
            _loggerMock.Object
        );

        var request = new PaymentCheckoutSessionRequest(
            WorkspaceId: workspaceId,
            WorkspaceName: "Test Workspace",
            ProviderCustomerId: null,
            PriceId: planId.ToString(),
            SuccessUrl: "http://localhost/success",
            CancelUrl: "http://localhost/cancel"
        );

        // Act
        var result = await provider.CreateCheckoutSessionAsync(request, CancellationToken.None);

        // Assert
        Assert.Contains("/app/sepay-checkout?code=SR", result.CheckoutUrl);
        _cacheMock.Verify(c => c.SetAsync(
            It.Is<string>(k => k.StartsWith("sepay_pending:")),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task WebhookHandler_Updates_Subscription_To_Active()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var planId = Guid.NewGuid();
        var webhookLoggerMock = new Mock<ILogger<SePaySubscriptionWebhookHandler>>();

        var existingSub = new Subscription 
        { 
            WorkspaceId = workspaceId, 
            PlanId = Guid.NewGuid(), 
            Status = SubscriptionStatus.Trialing 
        };

        _subscriptionRepositoryMock.Setup(r => r.GetByWorkspaceIdAsync(workspaceId)).ReturnsAsync(existingSub);

        var handler = new SePaySubscriptionWebhookHandler(
            _subscriptionRepositoryMock.Object,
            _unitOfWorkMock.Object,
            webhookLoggerMock.Object
        );

        var webhookEvent = new PaymentWebhookEvent
        {
            Provider = "sepay",
            EventId = "tx_123",
            EventType = "sepay.payment.succeeded",
            WorkspaceId = workspaceId,
            ProviderSubscriptionId = "SRXYZ123",
            Metadata = new Dictionary<string, string>
            {
                { "PlanId", planId.ToString() },
                { "Interval", "month" }
            }
        };

        // Act
        await handler.HandleAsync(webhookEvent, CancellationToken.None);

        // Assert
        Assert.Equal(SubscriptionStatus.Active, existingSub.Status);
        Assert.Equal(planId, existingSub.PlanId);
        Assert.Equal("sepay", existingSub.Provider);
        _subscriptionRepositoryMock.Verify(r => r.UpdateAsync(existingSub), Times.Once);
        _unitOfWorkMock.Verify(w => w.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
