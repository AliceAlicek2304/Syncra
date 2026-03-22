using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.Commands;

public record PublishPostCommand(
    Guid WorkspaceId,
    Guid PostId,
    Guid UserId,
    bool DryRun = false,
    DateTime? ScheduledAtUtc = null,
    Guid? IntegrationId = null
) : IRequest<PostDto>;