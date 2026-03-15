using MediatR;

namespace Syncra.Application.Features.Media.Commands;

public record DeleteMediaCommand(Guid WorkspaceId, Guid MediaId) : IRequest;
