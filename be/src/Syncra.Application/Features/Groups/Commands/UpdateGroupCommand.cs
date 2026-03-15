using MediatR;
using Syncra.Application.DTOs.Groups;

namespace Syncra.Application.Features.Groups.Commands;

public record UpdateGroupCommand(
    Guid WorkspaceId,
    Guid GroupId,
    string Name
) : IRequest<GroupDto?>;
