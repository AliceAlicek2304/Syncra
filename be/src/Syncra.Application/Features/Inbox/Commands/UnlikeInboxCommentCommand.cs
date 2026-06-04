using MediatR;
using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record UnlikeInboxCommentCommand(
    Guid WorkspaceId,
    string CommentId,
    string? LikeUri = null) : IRequest<ZernioLikeActionResponseDto>;
