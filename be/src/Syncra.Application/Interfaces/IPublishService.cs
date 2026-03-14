using Syncra.Application.DTOs.Posts;

namespace Syncra.Application.Interfaces;

public interface IPublishService
{
    Task<PublishResultDto> PublishAsync(
        Guid workspaceId,
        Guid postId,
        Guid userId,
        bool dryRun = false,
        CancellationToken cancellationToken = default);
}

