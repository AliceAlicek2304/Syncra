using MediatR;
using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed record SendPrivateReplyToCommentCommand(
    Guid WorkspaceId,
    string CommentId,
    string Message,
    IReadOnlyList<ZernioPrivateReplyQuickReplyDto>? QuickReplies = null,
    IReadOnlyList<ZernioPrivateReplyButtonDto>? Buttons = null) : IRequest<ZernioCommentActionResponseDto>;
