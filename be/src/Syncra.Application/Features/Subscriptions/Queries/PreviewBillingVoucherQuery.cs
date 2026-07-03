using MediatR;
using Syncra.Application.DTOs.Billing;

namespace Syncra.Application.Features.Subscriptions.Queries;

public sealed record PreviewBillingVoucherQuery(
    Guid WorkspaceId,
    Guid UserId,
    string PlanCode,
    string? Interval,
    string VoucherCode) : IRequest<BillingVoucherPreviewResponse>;
