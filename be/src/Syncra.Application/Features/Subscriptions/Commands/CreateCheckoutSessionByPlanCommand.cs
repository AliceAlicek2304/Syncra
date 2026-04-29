using MediatR;
using Syncra.Application.DTOs.Subscriptions;

namespace Syncra.Application.Features.Subscriptions.Commands;

public record CreateCheckoutSessionByPlanCommand(
    Guid WorkspaceId,
    string PlanCode,
    string? Interval,
    string? SuccessUrl,
    string? CancelUrl) : IRequest<CreateCheckoutSessionResponse>;
