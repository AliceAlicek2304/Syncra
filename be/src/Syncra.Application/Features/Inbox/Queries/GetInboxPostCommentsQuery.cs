using MediatR;
using Syncra.Application.DTOs.Inbox;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed record GetInboxPostCommentsQuery(
    Guid WorkspaceId,
    string ZernioPostId,
    string AccountId,
    string? Subreddit = null,
    int? Limit = null,
    string? Cursor = null,
    string? CommentId = null,
    string? SelfAccountId = null,
    string? Platform = null) : IRequest<ZernioPostCommentsResponseDto>;
