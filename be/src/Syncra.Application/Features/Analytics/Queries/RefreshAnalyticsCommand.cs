using MediatR;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record RefreshAnalyticsCommand(Guid WorkspaceId) : IRequest<Result>;
