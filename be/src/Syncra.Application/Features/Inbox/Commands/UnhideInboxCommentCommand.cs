using MediatR;
using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record UnhideInboxCommentCommand(
    Guid WorkspaceId,
    string CommentId) : IRequest<ZernioCommentActionResponseDto>;
