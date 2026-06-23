using Moq;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Xunit;

namespace Syncra.UnitTests.Application.Subscriptions;

public sealed class StartTrialCommandHandlerTests
{
    private readonly Mock<IWorkspaceRepository> _workspaceRepositoryMock = new();
    private readonly Mock<ISubscriptionRepository> _subscriptionRepositoryMock = new();
    private readonly Mock<IPlanRepository> _planRepositoryMock = new();
    private readonly Mock<IUserRepository> _userRepositoryMock = new();
    private readonly Mock<IUnitOfWork> _unitOfWorkMock = new();

    private readonly StartTrialCommandHandler _sut;

    public StartTrialCommandHandlerTests()
    {
        _sut = new StartTrialCommandHandler(
            _workspaceRepositoryMock.Object,
            _subscriptionRepositoryMock.Object,
            _planRepositoryMock.Object,
            _userRepositoryMock.Object,
            _unitOfWorkMock.Object);
    }

    [Fact]
    public async Task Handle_ThrowsNotFoundException_WhenWorkspaceDoesNotExist()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspaceId)).ReturnsAsync((Workspace?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspaceId, userId, "PRO"), CancellationToken.None));
        Assert.Equal("not_found", exception.Code);
    }

    [Fact]
    public async Task Handle_ThrowsForbiddenException_WhenUserIsNotWorkspaceOwner()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var nonOwnerId = Guid.NewGuid();
        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspace.Id, nonOwnerId, "PRO"), CancellationToken.None));
        Assert.Equal("forbidden", exception.Code);
    }

    [Fact]
    public async Task Handle_ThrowsNotFoundException_WhenPlanDoesNotExist()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("INVALID", It.IsAny<CancellationToken>())).ReturnsAsync((Plan?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "INVALID"), CancellationToken.None));
        Assert.Equal("not_found", exception.Code);
    }

    [Fact]
    public async Task Handle_ThrowsPlanInactiveException_WhenPlanIsInactive()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Code = "PRO", IsActive = false };
        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("PRO", It.IsAny<CancellationToken>())).ReturnsAsync(plan);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "PRO"), CancellationToken.None));
        Assert.Equal("plan_inactive", exception.Code);
    }

    [Fact]
    public async Task Handle_ThrowsNotFoundException_WhenSubscriptionDoesNotExist()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Code = "PRO", IsActive = true };
        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("PRO", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync((Subscription?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "PRO"), CancellationToken.None));
        Assert.Equal("not_found", exception.Code);
    }

    [Fact]
    public async Task Handle_ThrowsTrialAlreadyUsedException_WhenTrialHasAlreadyBeenUsed()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Code = "PRO", IsActive = true };
        var subscription = new Subscription
        {
            WorkspaceId = workspace.Id,
            TrialEndsAtUtc = DateTime.UtcNow.AddDays(5) // Trial already used
        };

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("PRO", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync(subscription);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "PRO"), CancellationToken.None));
        Assert.Equal("trial_already_used", exception.Code);
    }

    [Fact]
    public async Task Handle_SuccessfullyActivatesTrial_WhenEligible()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Id = Guid.NewGuid(), Code = "PRO", IsActive = true };
        var subscription = new Subscription
        {
            WorkspaceId = workspace.Id,
            TrialEndsAtUtc = null // Never trialed before
        };

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("PRO", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync(subscription);

        // Act
        await _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "PRO"), CancellationToken.None);

        // Assert
        Assert.Equal(plan.Id, subscription.PlanId);
        Assert.Equal(SubscriptionStatus.Trialing, subscription.Status);
        Assert.NotNull(subscription.TrialEndsAtUtc);
        Assert.True(subscription.TrialEndsAtUtc > DateTime.UtcNow);
        Assert.Null(subscription.EndsAtUtc);

        _subscriptionRepositoryMock.Verify(x => x.UpdateAsync(subscription), Times.Once);
        _unitOfWorkMock.Verify(x => x.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ThrowsStudentVerificationRequired_WhenStudentPlanIsNotVerified()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Id = Guid.NewGuid(), Code = "STUDENT", IsActive = true };
        var user = User.Create("owner@example.com", "hash");

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("STUDENT", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        _userRepositoryMock.Setup(x => x.GetByIdAsync(ownerId)).ReturnsAsync(user);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<DomainException>(() =>
            _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "STUDENT"), CancellationToken.None));
        Assert.Equal("student_verification_required", exception.Code);
    }

    [Fact]
    public async Task Handle_SuccessfullyActivatesTrial_WhenStudentPlanIsVerified()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var workspace = Workspace.Create(ownerId, "Acme", "acme");
        var plan = new Plan { Id = Guid.NewGuid(), Code = "STUDENT", IsActive = true };
        var user = User.Create("owner@example.com", "hash");
        user.VerifyStudentEmail("owner@school.edu", DateTime.UtcNow);
        var subscription = new Subscription
        {
            WorkspaceId = workspace.Id,
            TrialEndsAtUtc = null
        };

        _workspaceRepositoryMock.Setup(x => x.GetByIdAsync(workspace.Id)).ReturnsAsync(workspace);
        _planRepositoryMock.Setup(x => x.GetByCodeAsync("STUDENT", It.IsAny<CancellationToken>())).ReturnsAsync(plan);
        _userRepositoryMock.Setup(x => x.GetByIdAsync(ownerId)).ReturnsAsync(user);
        _subscriptionRepositoryMock.Setup(x => x.GetByWorkspaceIdAsync(workspace.Id)).ReturnsAsync(subscription);

        // Act
        await _sut.Handle(new StartTrialCommand(workspace.Id, ownerId, "STUDENT"), CancellationToken.None);

        // Assert
        Assert.Equal(plan.Id, subscription.PlanId);
        Assert.Equal(SubscriptionStatus.Trialing, subscription.Status);
        Assert.NotNull(subscription.TrialEndsAtUtc);
    }
}
