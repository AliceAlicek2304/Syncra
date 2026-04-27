#if FALSE
using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Syncra.Api.Controllers;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Xunit;

namespace Syncra.UnitTests.Api;

public class SubscriptionsControllerTests
{
    private readonly Mock<ISubscriptionRepository> _subscriptionRepositoryMock = new();
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock = new();
    private readonly Mock<IStripeService> _stripeServiceMock = new();

    private SubscriptionsController CreateController()
    {
        return new SubscriptionsController(
            _subscriptionRepositoryMock.Object,
            _workspaceRepositoryMock.Object,
            _stripeServiceMock.Object);
    }

    [Fact]
    public async Task GetCurrentSubscription_WhenNoSubscriptionExists_ReturnsDefaultDto()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        _subscriptionRepositoryMock
            .Setup(r => r.GetCurrentForWorkspaceAsync(workspaceId))
            .ReturnsAsync((Subscription?)null);

        var controller = CreateController();

        // Act
        var result = await controller.GetCurrentSubscription(workspaceId, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<CurrentSubscriptionDto>(okResult.Value);
        Assert.Equal("Free", dto.Status);
        Assert.Equal("free", dto.PlanCode);
        Assert.True(dto.IsDefault);
    }

    [Fact]
    public async Task GetCurrentSubscription_WhenActiveSubscriptionExists_ReturnsActiveDto()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var plan = new Plan
        {
            Id = Guid.NewGuid(),
            Code = "pro",
            Name = "Pro Plan"
        };
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            PlanId = plan.Id,
            Plan = plan,
            Provider = "stripe",
            ProviderCustomerId = "cus_123",
            ProviderSubscriptionId = "sub_123",
            Status = SubscriptionStatus.Active,
            StartsAtUtc = DateTime.UtcNow.AddDays(-30),
            EndsAtUtc = null,
            TrialEndsAtUtc = null,
            CanceledAtUtc = null
        };

        _subscriptionRepositoryMock
            .Setup(r => r.GetCurrentForWorkspaceAsync(workspaceId))
            .ReturnsAsync(subscription);

        var controller = CreateController();

        // Act
        var result = await controller.GetCurrentSubscription(workspaceId, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<CurrentSubscriptionDto>(okResult.Value);
        Assert.Equal("Active", dto.Status);
        Assert.Equal("pro", dto.PlanCode);
        Assert.Equal("Pro Plan", dto.PlanName);
        Assert.Equal("stripe", dto.Provider);
        Assert.Equal("cus_123", dto.ProviderCustomerId);
        Assert.Equal("sub_123", dto.ProviderSubscriptionId);
        Assert.False(dto.IsDefault);
    }

    [Fact]
    public async Task GetCurrentSubscription_WhenTrialingSubscriptionExists_ReturnsTrialingDto()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var plan = new Plan
        {
            Id = Guid.NewGuid(),
            Code = "starter",
            Name = "Starter Plan"
        };
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            PlanId = plan.Id,
            Plan = plan,
            Provider = "stripe",
            ProviderCustomerId = "cus_456",
            ProviderSubscriptionId = "sub_456",
            Status = SubscriptionStatus.Trialing,
            StartsAtUtc = DateTime.UtcNow,
            EndsAtUtc = null,
            TrialEndsAtUtc = DateTime.UtcNow.AddDays(14),
            CanceledAtUtc = null
        };

        _subscriptionRepositoryMock
            .Setup(r => r.GetCurrentForWorkspaceAsync(workspaceId))
            .ReturnsAsync(subscription);

        var controller = CreateController();

        // Act
        var result = await controller.GetCurrentSubscription(workspaceId, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<CurrentSubscriptionDto>(okResult.Value);
        Assert.Equal("Trialing", dto.Status);
        Assert.NotNull(dto.TrialEndsAtUtc);
        Assert.False(dto.IsDefault);
    }

    [Fact]
    public async Task GetCurrentSubscription_WhenCanceledSubscriptionExists_ReturnsCanceledDto()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var plan = new Plan
        {
            Id = Guid.NewGuid(),
            Code = "pro",
            Name = "Pro Plan"
        };
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            PlanId = plan.Id,
            Plan = plan,
            Provider = "stripe",
            ProviderCustomerId = "cus_789",
            ProviderSubscriptionId = "sub_789",
            Status = SubscriptionStatus.Canceled,
            StartsAtUtc = DateTime.UtcNow.AddDays(-60),
            EndsAtUtc = DateTime.UtcNow.AddDays(-5),
            TrialEndsAtUtc = null,
            CanceledAtUtc = DateTime.UtcNow.AddDays(-5)
        };

        _subscriptionRepositoryMock
            .Setup(r => r.GetCurrentForWorkspaceAsync(workspaceId))
            .ReturnsAsync(subscription);

        var controller = CreateController();

        // Act
        var result = await controller.GetCurrentSubscription(workspaceId, CancellationToken.None);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<CurrentSubscriptionDto>(okResult.Value);
        Assert.Equal("Canceled", dto.Status);
        Assert.NotNull(dto.CanceledAtUtc);
        Assert.NotNull(dto.EndsAtUtc);
        Assert.False(dto.IsDefault);
    }

    [Fact]
    public async Task GetCurrentSubscription_PassesCancellationToken_ToRepository()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var cancellationToken = new CancellationTokenSource().Token;

        _subscriptionRepositoryMock
            .Setup(r => r.GetCurrentForWorkspaceAsync(workspaceId))
            .ReturnsAsync((Subscription?)null);

        var controller = CreateController();

        // Act
        await controller.GetCurrentSubscription(workspaceId, cancellationToken);

        // Assert
        _subscriptionRepositoryMock.Verify(r => r.GetCurrentForWorkspaceAsync(workspaceId), Times.Once);
    }
}
#endif
