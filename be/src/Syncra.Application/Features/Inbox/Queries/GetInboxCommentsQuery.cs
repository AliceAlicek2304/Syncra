using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public record GetInboxCommentsQuery(
    Guid WorkspaceId,
    int Limit = 50,
    string? Cursor = null,
    string? Platform = null,
    string? AccountId = null,
    string? ProfileId = null,
    int? MinComments = null,
    DateTime? Since = null,
    string? SortBy = null,
    string? SortOrder = null
) : IRequest<InboxCommentedPostsResponseDto>;
