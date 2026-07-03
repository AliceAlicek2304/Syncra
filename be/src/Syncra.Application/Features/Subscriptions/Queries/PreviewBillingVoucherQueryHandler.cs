using MediatR;
using Syncra.Application.DTOs.Billing;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Subscriptions.Queries;

public sealed class PreviewBillingVoucherQueryHandler
    : IRequestHandler<PreviewBillingVoucherQuery, BillingVoucherPreviewResponse>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IBillingVoucherService _billingVoucherService;

    public PreviewBillingVoucherQueryHandler(
        IWorkspaceRepository workspaceRepository,
        IPlanRepository planRepository,
        IBillingVoucherService billingVoucherService)
    {
        _workspaceRepository = workspaceRepository;
        _planRepository = planRepository;
        _billingVoucherService = billingVoucherService;
    }

    public async Task<BillingVoucherPreviewResponse> Handle(
        PreviewBillingVoucherQuery request,
        CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId)
            ?? throw new DomainException("not_found", "Workspace not found.");

        if (workspace.OwnerUserId != request.UserId)
        {
            throw new DomainException("forbidden", "Only the workspace owner can manage billing.");
        }

        var plan = await _planRepository.GetByCodeAsync(request.PlanCode, cancellationToken)
            ?? throw new DomainException("not_found", $"Plan '{request.PlanCode}' was not found.");

        if (!plan.IsActive)
        {
            throw new DomainException("plan_inactive", $"Plan '{request.PlanCode}' is not active.");
        }

        if (string.IsNullOrWhiteSpace(request.VoucherCode))
        {
            throw new DomainException("invalid_discount_code", "Vui lòng nhập mã giảm giá.");
        }

        var interval = string.Equals(request.Interval, "year", StringComparison.OrdinalIgnoreCase)
            ? "year"
            : "month";

        return await _billingVoucherService.PreviewAsync(
            request.UserId,
            plan,
            interval,
            request.VoucherCode,
            cancellationToken);
    }
}
