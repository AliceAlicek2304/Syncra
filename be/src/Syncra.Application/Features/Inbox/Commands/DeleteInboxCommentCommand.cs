using MediatR;
using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record DeleteInboxCommentCommand(
    Guid WorkspaceId,
    string CommentId) : IRequest<ZernioDeleteCommentResponseDto>;
