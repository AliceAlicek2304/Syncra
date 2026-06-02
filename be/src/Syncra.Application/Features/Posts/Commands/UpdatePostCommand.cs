using MediatR;
using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Features.Posts.Commands;

public record UpdatePostCommand(
    Guid WorkspaceId,
    Guid PostId,
    Guid UserId,
    string Title,
    string Content,
    DateTime? ScheduledAtUtc,
    string? Status,
    IReadOnlyCollection<Guid>? MediaIds
) : IRequest<PostDto?>;