using MediatR;
using Syncra.Application.DTOs.Subscriptions;

namespace Syncra.Application.Features.Subscriptions.Commands;

public record CreateCheckoutSessionByPlanCommand(
    Guid WorkspaceId,
    Guid UserId,
    string PlanCode,
    string? Interval,
    string? SuccessUrl,
    string? CancelUrl) : IRequest<CreateCheckoutSessionResponse>;
