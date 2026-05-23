using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.CreateZernioPost;

public sealed record CreateZernioPostCommand(
    Guid WorkspaceId,
    Guid UserId,
    string Title,
    string Content,
    IReadOnlyList<Guid> SocialAccountIds,
    DateTime? ScheduledAtUtc,
    bool PublishNow
) : IRequest<PostDto>;
