using MediatR;
using Syncra.Application.DTOs.Groups;

namespace Syncra.Application.Features.Groups.Queries;

public record GetGroupByIdQuery(
    Guid WorkspaceId,
    Guid GroupId
) : IRequest<GroupDto?>;
