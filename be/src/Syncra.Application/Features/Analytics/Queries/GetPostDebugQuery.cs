using MediatR;
using Syncra.Application.DTOs.Analytics;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetPostDebugQuery(Guid WorkspaceId, Guid PostId) : IRequest<PostDebugDto?>;
