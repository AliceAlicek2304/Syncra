using MediatR;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Subscriptions.Commands;

public sealed class StartTrialCommandHandler : IRequestHandler<StartTrialCommand>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public StartTrialCommandHandler(
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IUserRepository userRepository,
        IUnitOfWork unitOfWork)
    {
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(StartTrialCommand request, CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId)
            ?? throw new DomainException("not_found", "Workspace not found.");

        if (workspace.OwnerUserId != request.UserId)
        {
            throw new DomainException("forbidden", "Only the workspace owner can manage billing.");
        }

        var plan = await _planRepository.GetByCodeAsync(request.PlanCode.ToUpper(), cancellationToken)
            ?? throw new DomainException("not_found", $"Plan '{request.PlanCode}' was not found.");

        if (!plan.IsActive)
        {
            throw new DomainException("plan_inactive", $"Plan '{request.PlanCode}' is not active.");
        }

        if (string.Equals(plan.Code, "STUDENT", StringComparison.OrdinalIgnoreCase))
        {
            throw new DomainException(
                "plan_removed",
                "Student is no longer a standalone plan. Use the student discount on Basic or Max.");
        }

        var existingSub = await _subscriptionRepository.GetByWorkspaceIdAsync(workspace.Id)
            ?? throw new DomainException("not_found", $"Subscription record for workspace '{workspace.Id}' was not found.");

        // Trial checks
        var hasUsedTrial = existingSub.TrialEndsAtUtc.HasValue;
        if (hasUsedTrial)
        {
            throw new DomainException("trial_already_used", "A free trial has already been used for this workspace.");
        }

        var now = DateTime.UtcNow;
        existingSub.PlanId = plan.Id;
        existingSub.Status = SubscriptionStatus.Trialing;
        existingSub.StartsAtUtc = now;
        existingSub.EndsAtUtc = null;
        existingSub.TrialEndsAtUtc = now.AddDays(14);
        existingSub.LastEventTimestampUtc = now;

        await _subscriptionRepository.UpdateAsync(existingSub);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
