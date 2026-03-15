using MediatR;
using Syncra.Application.DTOs.Subscriptions;

namespace Syncra.Application.Features.Subscriptions.Commands;

public record CreateCheckoutSessionCommand(
    Guid WorkspaceId,
    string PriceId,
    string? SuccessUrl,
    string? CancelUrl) : IRequest<CreateCheckoutSessionResponse>;
