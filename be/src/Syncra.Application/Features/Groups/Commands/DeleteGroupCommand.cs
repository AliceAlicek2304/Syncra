using MediatR;

namespace Syncra.Application.Features.Groups.Commands;

public record DeleteGroupCommand(
    Guid WorkspaceId,
    Guid GroupId
) : IRequest<bool>;
