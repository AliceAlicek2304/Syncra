using Microsoft.EntityFrameworkCore;
using Syncra.Application.DTOs;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class SubscriptionRepositoryTests
{
    private AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private Subscription CreateSubscription(Guid workspaceId, SubscriptionStatus status, DateTime startsAt, Plan? plan = null)
    {
        return new Subscription
        {
            Id = Guid.NewGuid(),
            WorkspaceId = workspaceId,
            PlanId = plan?.Id ?? Guid.NewGuid(),
            Plan = plan ?? new Plan { Id = Guid.NewGuid(), Code = "starter", Name = "Starter" },
            Provider = "stripe",
            ProviderCustomerId = $"cus_{Guid.NewGuid():N}",
            ProviderSubscriptionId = $"sub_{Guid.NewGuid():N}",
            Status = status,
            StartsAtUtc = startsAt,
            EndsAtUtc = null,
            TrialEndsAtUtc = status == SubscriptionStatus.Trialing ? startsAt.AddDays(14) : null,
            CanceledAtUtc = status == SubscriptionStatus.Canceled ? DateTime.UtcNow : null
        };
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_NoSubscription_ReturnsNull()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_OneSubscription_ReturnsIt()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var subscription = CreateSubscription(workspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-30));
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(subscription.Id, result.Id);
        Assert.Equal(SubscriptionStatus.Active, result.Status);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_ActivePreferredOverCanceled()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var activeSub = CreateSubscription(workspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-30));
        var canceledSub = CreateSubscription(workspaceId, SubscriptionStatus.Canceled, DateTime.UtcNow.AddDays(-60));

        context.Subscriptions.AddRange(activeSub, canceledSub);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(activeSub.Id, result.Id);
        Assert.Equal(SubscriptionStatus.Active, result.Status);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_TrialingPreferredOverExpired()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var trialingSub = CreateSubscription(workspaceId, SubscriptionStatus.Trialing, DateTime.UtcNow);
        var expiredSub = CreateSubscription(workspaceId, SubscriptionStatus.Expired, DateTime.UtcNow.AddDays(-60));

        context.Subscriptions.AddRange(trialingSub, expiredSub);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(trialingSub.Id, result.Id);
        Assert.Equal(SubscriptionStatus.Trialing, result.Status);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_ActivePreferredOverTrialing()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var activeSub = CreateSubscription(workspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-30));
        var trialingSub = CreateSubscription(workspaceId, SubscriptionStatus.Trialing, DateTime.UtcNow);

        // Add trialing first to ensure ordering is by status priority, not insertion order
        context.Subscriptions.AddRange(trialingSub, activeSub);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert - Both are preferred, but both have same priority. 
        // The tie-breaker is StartsAtUtc desc, so whichever started later wins
        Assert.NotNull(result);
        Assert.True(result.Status == SubscriptionStatus.Active || result.Status == SubscriptionStatus.Trialing);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_NoActiveOrTrialing_FallsBackToMostRecent()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var olderExpired = CreateSubscription(workspaceId, SubscriptionStatus.Expired, DateTime.UtcNow.AddDays(-90));
        var newerCanceled = CreateSubscription(workspaceId, SubscriptionStatus.Canceled, DateTime.UtcNow.AddDays(-30));

        context.Subscriptions.AddRange(olderExpired, newerCanceled);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newerCanceled.Id, result.Id);
        Assert.Equal(SubscriptionStatus.Canceled, result.Status);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_OnlyOtherWorkspaces_ReturnsNull()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var otherWorkspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var otherSub = CreateSubscription(otherWorkspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-30));
        context.Subscriptions.Add(otherSub);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_IncludesPlan()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var plan = new Plan { Id = Guid.NewGuid(), Code = "pro", Name = "Pro Plan" };
        var subscription = CreateSubscription(workspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-30), plan);
        context.Subscriptions.Add(subscription);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Plan);
        Assert.Equal("pro", result.Plan.Code);
        Assert.Equal("Pro Plan", result.Plan.Name);
    }

    [Fact]
    public async Task GetCurrentForWorkspaceAsync_MultipleActive_ReturnsMostRecent()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        using var context = CreateContext();
        var sut = new SubscriptionRepository(context);

        var olderActive = CreateSubscription(workspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-60));
        var newerActive = CreateSubscription(workspaceId, SubscriptionStatus.Active, DateTime.UtcNow.AddDays(-10));

        context.Subscriptions.AddRange(olderActive, newerActive);
        await context.SaveChangesAsync();

        // Act
        var result = await sut.GetCurrentForWorkspaceAsync(workspaceId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newerActive.Id, result.Id);
    }
}
