using MediatR;
using Syncra.Application.DTOs.Groups;

namespace Syncra.Application.Features.Groups.Commands;

public record CreateGroupCommand(
    Guid WorkspaceId,
    string Name
) : IRequest<GroupDto>;
