using MediatR;
using Syncra.Application.DTOs.Groups;

namespace Syncra.Application.Features.Groups.Queries;

public record GetGroupsQuery(
    Guid WorkspaceId
) : IRequest<IReadOnlyList<GroupDto>>;
