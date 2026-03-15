using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Subscriptions.Queries;

public record GetCurrentSubscriptionQuery(Guid WorkspaceId) : IRequest<CurrentSubscriptionDto>;
