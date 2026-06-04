using MediatR;

namespace Syncra.Application.Features.Inbox.Commands;

public record MarkCommentReadCommand(
    Guid WorkspaceId,
    string CommentId
) : IRequest<bool>;
