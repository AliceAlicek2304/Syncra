using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public record GetInboxCommentsQuery(
    Guid WorkspaceId,
    int Limit = 50,
    DateTime? Before = null,
    string? Platform = null,
    string? AccountId = null
) : IRequest<IReadOnlyList<InboxCommentDto>>;
