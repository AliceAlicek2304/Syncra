using MediatR;
using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record LikeInboxCommentCommand(
    Guid WorkspaceId,
    string CommentId,
    string? Cid = null) : IRequest<ZernioLikeActionResponseDto>;
