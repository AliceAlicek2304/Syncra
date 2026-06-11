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
    private readonly ILogger<ZernioSyncJob> _logger;

    public ZernioSyncJob(
        IZernioClient zernioClient,
        IPostRepository postRepository,
        IZernioProfileRepository zernioProfileRepository,
        IUnitOfWork unitOfWork,
        ILogger<ZernioSyncJob> logger)
    {
        _zernioClient = zernioClient;
        _postRepository = postRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _unitOfWork = unitOfWork;
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
                await SyncPostsForProfileAsync(profile.ZernioProfileId, cancellationToken);
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
                    hasChanges = true;
                }
                else if (zernioStatus == "failed" && localPost.Status != PostStatus.Failed)
                {
                    _logger.LogInformation("Post {PostId} status changed to Failed on Zernio. Updating local DB.", localPost.Id);
                    localPost.MarkZernioFailed(zernioPost.PublishedAt ?? now, "Marked as failed via sync job.");
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
}
