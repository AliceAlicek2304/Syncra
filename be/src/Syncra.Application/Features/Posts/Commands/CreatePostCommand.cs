using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.Commands;

public record CreatePostCommand(
    Guid WorkspaceId,
    Guid UserId,
    string Title,
    string Content,
    DateTime? ScheduledAtUtc,
    Guid? IntegrationId,
    IReadOnlyCollection<Guid>? MediaIds
) : IRequest<PostDto>;