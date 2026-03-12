using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Jobs;

public sealed class DuePostPublishJob
{
    private readonly IPostRepository _postRepository;
    private readonly IPublishService _publishService;
    private readonly ILogger<DuePostPublishJob> _logger;

    private const int DefaultBatchSize = 50;
    private const int MaxRetryAttempts = 3;

    public DuePostPublishJob(
        IPostRepository postRepository,
        IPublishService publishService,
        ILogger<DuePostPublishJob> logger)
    {
        _postRepository = postRepository;
        _publishService = publishService;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;
        var processed = 0;

        _logger.LogInformation("Starting due-post publish job at {UtcNow}.", utcNow);

        while (!cancellationToken.IsCancellationRequested)
        {
            var duePosts = await _postRepository.GetDueScheduledPostsAsync(
                utcNow,
                DefaultBatchSize,
                cancellationToken);

            if (duePosts.Count == 0)
            {
                break;
            }

            foreach (var post in duePosts)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    break;
                }

                await ProcessPostAsync(post, cancellationToken);
                processed++;
            }
        }

        _logger.LogInformation("Completed due-post publish job. Processed {Processed} posts.", processed);
    }

    private async Task ProcessPostAsync(Post post, CancellationToken cancellationToken)
    {
        var attempt = 0;

        while (true)
        {
            attempt++;

            try
            {
                var result = await _publishService.PublishAsync(
                    post.WorkspaceId,
                    post.Id,
                    post.UserId,
                    dryRun: false,
                    cancellationToken);

                if (result.Success)
                {
                    _logger.LogInformation(
                        "Successfully published scheduled post {PostId} for workspace {WorkspaceId} on attempt {Attempt}.",
                        post.Id,
                        post.WorkspaceId,
                        attempt);
                    return;
                }

                if (!IsTransientFailure(result.ErrorCode, result.ErrorMessage) || attempt >= MaxRetryAttempts)
                {
                    _logger.LogWarning(
                        "Publishing scheduled post {PostId} for workspace {WorkspaceId} failed with non-transient or exhausted retries. ErrorCode={ErrorCode}, ErrorMessage={ErrorMessage}, Attempt={Attempt}.",
                        post.Id,
                        post.WorkspaceId,
                        result.ErrorCode,
                        result.ErrorMessage,
                        attempt);
                    return;
                }

                _logger.LogWarning(
                    "Transient failure when publishing scheduled post {PostId} for workspace {WorkspaceId}. ErrorCode={ErrorCode}, ErrorMessage={ErrorMessage}, Attempt={Attempt}. Retrying...",
                    post.Id,
                    post.WorkspaceId,
                    result.ErrorCode,
                    result.ErrorMessage,
                    attempt);
            }
            catch (Exception ex)
            {
                if (attempt >= MaxRetryAttempts)
                {
                    _logger.LogError(
                        ex,
                        "Exception when publishing scheduled post {PostId} for workspace {WorkspaceId} and max retries exhausted on attempt {Attempt}.",
                        post.Id,
                        post.WorkspaceId,
                        attempt);
                    return;
                }

                _logger.LogWarning(
                    ex,
                    "Transient exception when publishing scheduled post {PostId} for workspace {WorkspaceId} on attempt {Attempt}. Retrying...",
                    post.Id,
                    post.WorkspaceId,
                    attempt);
            }
        }
    }

    public static bool IsTransientFailure(string? errorCode, string? errorMessage)
    {
        if (string.IsNullOrWhiteSpace(errorCode) && string.IsNullOrWhiteSpace(errorMessage))
        {
            return false;
        }

        var code = errorCode?.ToLowerInvariant() ?? string.Empty;
        var message = errorMessage?.ToLowerInvariant() ?? string.Empty;

        if (code is "timeout" or "rate_limited" or "transient_error")
        {
            return true;
        }

        if (code.StartsWith("http_5"))
        {
            return true;
        }

        if (message.Contains("timeout") || message.Contains("temporarily unavailable"))
        {
            return true;
        }

        return false;
    }
}

