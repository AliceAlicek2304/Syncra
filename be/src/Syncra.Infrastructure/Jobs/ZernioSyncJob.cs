using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Enums;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Jobs;

public class ZernioSyncJob
{
    private readonly IZernioClient _zernioClient;
    private readonly IPostRepository _postRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IActivityEventService _activityEventService;
    private readonly ILogger<ZernioSyncJob> _logger;

    public ZernioSyncJob(
        IZernioClient zernioClient,
        IPostRepository postRepository,
        IZernioProfileRepository zernioProfileRepository,
        IUnitOfWork unitOfWork,
        IActivityEventService activityEventService,
        ILogger<ZernioSyncJob> logger)
    {
        _zernioClient = zernioClient;
        _postRepository = postRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _unitOfWork = unitOfWork;
        _activityEventService = activityEventService;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting Zernio status synchronization job.");

        try
        {
            var profiles = await _zernioProfileRepository.GetAllActiveAsync();
            if (profiles.Count == 0)
            {
                _logger.LogInformation("No active Zernio profiles found. Skipping sync.");
                return;
            }

            foreach (var profile in profiles)
            {
                try
                {
                    await SyncPostsForProfileAsync(profile.ZernioProfileId, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error synchronizing posts for Zernio profile {ProfileId}", profile.ZernioProfileId);
                }
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Finished Zernio status synchronization job.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during Zernio status synchronization job.");
            throw;
        }
    }

    private async Task SyncPostsForProfileAsync(string profileId, CancellationToken cancellationToken)
    {
        // Fetch recent posts from Zernio scoped to this profile. Limit to 50, sorted by updatedAt descending.
        var response = await _zernioClient.ListPostsAsync(limit: 50, sortBy: "updatedAt:desc", profileId: profileId, cancellationToken: cancellationToken);

        if (response == null || response.Posts == null || !response.Posts.Any())
        {
            return;
        }

        foreach (var zernioPost in response.Posts)
        {
                var localPost = await _postRepository.GetByZernioPostIdAsync(zernioPost.Id);

                if (localPost == null)
                {
                    // Post not found in local DB, might belong to another workspace or not tracked here.
                    continue;
                }

                bool hasChanges = false;
                var now = DateTime.UtcNow;
                var zernioStatus = zernioPost.Status.ToLowerInvariant();

                if (zernioStatus == "published" && localPost.Status != PostStatus.Published)
                {
                    _logger.LogInformation("Post {PostId} status changed to Published on Zernio. Updating local DB.", localPost.Id);
                    localPost.MarkZernioPublished(zernioPost.PublishedAt ?? now);
                    await RecordPostStatusActivityAsync(localPost, "post.published", "success", "Post published", null, cancellationToken);
                    hasChanges = true;
                }
                else if (zernioStatus == "failed" && localPost.Status != PostStatus.Failed)
                {
                    _logger.LogInformation("Post {PostId} status changed to Failed on Zernio. Updating local DB.", localPost.Id);
                    localPost.MarkZernioFailed(zernioPost.PublishedAt ?? now, "Marked as failed via sync job.");
                    await RecordPostStatusActivityAsync(localPost, "post.failed", "failed", "Post failed", "Marked as failed via sync job.", cancellationToken);
                    hasChanges = true;
                }
                else if (zernioStatus == "scheduled" && localPost.Status != PostStatus.Scheduled)
                {
                    _logger.LogInformation("Post {PostId} status changed to Scheduled on Zernio. Updating local DB.", localPost.Id);
                    localPost.TransitionTo(PostStatus.Scheduled);
                    hasChanges = true;
                }
                else if (zernioStatus == "cancelled" && !localPost.IsDeleted)
                {
                    _logger.LogInformation("Post {PostId} cancelled on Zernio. Updating local DB.", localPost.Id);
                    localPost.MarkAsDeleted();
                    hasChanges = true;
                }

                // Also update platform targets
                foreach (var zernioTarget in zernioPost.Platforms)
                {
                    var targetStatus = zernioTarget.Status.ToLowerInvariant();
                    var localTarget = localPost.PlatformTargets.FirstOrDefault(t => 
                        string.Equals(t.Platform, zernioTarget.Platform, StringComparison.OrdinalIgnoreCase));

                    if (localTarget != null)
                    {
                        if (targetStatus == "published" && localTarget.Status != PostPlatformStatus.Published)
                        {
                            localTarget.MarkPublished(zernioTarget.PlatformPostId ?? string.Empty, zernioTarget.PlatformPostUrl, zernioTarget.PublishedAt ?? now);
                            hasChanges = true;
                        }
                        else if (targetStatus == "failed" && localTarget.Status != PostPlatformStatus.Failed)
                        {
                            localTarget.MarkFailed(zernioTarget.ErrorMessage ?? "Marked as failed via sync job.", zernioTarget.PublishedAt ?? now);
                            hasChanges = true;
                        }
                    }
                }

                if (hasChanges)
                {
                    await _postRepository.UpdateAsync(localPost);
                }
            }
    }

    private async Task RecordPostStatusActivityAsync(
        Post post,
        string eventType,
        string status,
        string title,
        string? description,
        CancellationToken cancellationToken)
    {
        await _activityEventService.RecordAsync(new ActivityEventRequest(
            EventType: eventType,
            EventGroup: "post",
            Status: status,
            Title: title,
            Description: description ?? post.Title.Value,
            WorkspaceId: post.WorkspaceId,
            UserId: post.UserId,
            SubjectType: "Post",
            SubjectId: post.Id.ToString(),
            Metadata: new Dictionary<string, string?>
            {
                ["postId"] = post.Id.ToString(),
                ["zernioPostId"] = post.ZernioPostId,
                ["publishedAtUtc"] = post.PublishedAtUtc?.ToString("O"),
                ["error"] = post.PublishLastError
            }), cancellationToken);
    }
}
