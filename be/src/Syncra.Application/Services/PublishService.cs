using System.Text.Json;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Services;

public sealed class PublishService : IPublishService
{
    private readonly IPostRepository _postRepository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPublishAdapterRegistry _publishAdapterRegistry;

    public PublishService(
        IPostRepository postRepository,
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork,
        IPublishAdapterRegistry publishAdapterRegistry)
    {
        _postRepository = postRepository;
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
        _publishAdapterRegistry = publishAdapterRegistry;
    }

    public async Task<PublishResultDto> PublishAsync(
        Guid workspaceId,
        Guid postId,
        Guid userId,
        bool dryRun = false,
        CancellationToken cancellationToken = default)
    {
        var post = await _postRepository.GetByIdAsync(postId);
        if (post is null || post.WorkspaceId != workspaceId)
        {
            throw new InvalidOperationException("Post not found in the specified workspace.");
        }

        if (PostStatusTransitions.IsTerminal(post.Status))
        {
            return MapFromPost(post, post.Status == PostStatus.Published);
        }

        if (post.Status is not PostStatus.Draft and not PostStatus.Scheduled and not PostStatus.Publishing)
        {
            throw new InvalidOperationException($"Post in status '{post.Status}' cannot be published.");
        }

        if (post.IntegrationId is null)
        {
            throw new InvalidOperationException("Post does not have an integration configured.");
        }

        if (post.ScheduledAt is not null && post.ScheduledAt.IsInFuture)
        {
            throw new InvalidOperationException("Post is scheduled for the future and cannot be published immediately.");
        }

        var integration = post.Integration;
        if (integration is null)
        {
            integration = await _integrationRepository.GetByIdAsync(post.IntegrationId.Value)
                           ?? throw new InvalidOperationException("Integration not found.");
            post.Integration = integration;
        }

        if (!integration.IsActive)
        {
            throw new InvalidOperationException("Integration is not active.");
        }

        if (string.IsNullOrWhiteSpace(integration.AccessToken))
        {
            throw new InvalidOperationException("Integration access token is missing.");
        }

        if (dryRun)
        {
            return MapFromPost(post, success: post.Status == PostStatus.Published);
        }

        var utcNow = DateTime.UtcNow;

        if (post.Status != PostStatus.Publishing)
        {
            post.TransitionTo(PostStatus.Publishing);
            post.MarkPublishAttempt(utcNow);
            await _postRepository.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        var adapter = _publishAdapterRegistry.GetAdapterOrDefault(integration.Platform);
        if (adapter is null)
        {
            var errorMessage = $"Social provider '{integration.Platform}' is not registered.";
            post.MarkPublishFailure(utcNow, errorMessage);
            await _postRepository.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new PublishResultDto(
                Success: false,
                ExternalId: null,
                ExternalUrl: null,
                ErrorCode: "provider_not_registered",
                ErrorMessage: errorMessage,
                RawMetadata: null);
        }

        PublishResult providerResult;
        try
        {
            var request = BuildPublishRequest(workspaceId, post);
            providerResult = await adapter.PublishAsync(
                integration.AccessToken!,
                request,
                cancellationToken);
        }
        catch (Exception ex)
        {
            post.MarkPublishFailure(utcNow, ex.Message);
            await _postRepository.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new PublishResultDto(
                Success: false,
                ExternalId: null,
                ExternalUrl: null,
                ErrorCode: "publish_exception",
                ErrorMessage: ex.Message,
                RawMetadata: null);
        }

        var rawMetadata = providerResult.Metadata is { Count: > 0 }
            ? JsonSerializer.Serialize(providerResult.Metadata)
            : null;

        if (providerResult.IsSuccess)
        {
            post.MarkPublishSuccess(
                utcNow,
                providerResult.ExternalId,
                providerResult.ExternalUrl,
                rawMetadata);

            await _postRepository.UpdateAsync(post);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return new PublishResultDto(
                Success: true,
                ExternalId: providerResult.ExternalId,
                ExternalUrl: providerResult.ExternalUrl,
                ErrorCode: null,
                ErrorMessage: null,
                RawMetadata: rawMetadata);
        }

        var errorText = FormatProviderError(providerResult);

        post.MarkPublishFailure(
            utcNow,
            errorText,
            rawMetadata);

        await _postRepository.UpdateAsync(post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new PublishResultDto(
            Success: false,
            ExternalId: providerResult.ExternalId,
            ExternalUrl: providerResult.ExternalUrl,
            ErrorCode: providerResult.Error?.Code,
            ErrorMessage: errorText,
            RawMetadata: rawMetadata);
    }

    private static PublishRequest BuildPublishRequest(Guid workspaceId, Post post)
    {
        var mediaIds = post.Media.Select(m => m.Id).ToList();

        var metadata = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(post.Integration?.Metadata))
        {
            try
            {
                var integrationMeta = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(post.Integration.Metadata);
                if (integrationMeta is not null)
                {
                    foreach (var kv in integrationMeta)
                        metadata[kv.Key] = kv.Value;
                }
            }
            catch { /* ignore */ }
        }

        return new PublishRequest
        {
            WorkspaceId = workspaceId,
            PostId = post.Id,
            Content = BuildContent(post),
            ScheduledAtUtc = post.ScheduledAt?.UtcValue,
            MediaIds = mediaIds,
            Metadata = metadata
        };
    }

    private static string BuildContent(Post post)
    {
        if (string.IsNullOrWhiteSpace(post.Title))
        {
            return post.Content;
        }

        return $"{post.Title}\n\n{post.Content}";
    }

    private static string FormatProviderError(PublishResult result)
    {
        if (result.Error is null)
        {
            return "Publish failed.";
        }

        if (string.IsNullOrWhiteSpace(result.Error.Code))
        {
            return string.IsNullOrWhiteSpace(result.Error.Message)
                ? "Publish failed."
                : result.Error.Message;
        }

        return string.IsNullOrWhiteSpace(result.Error.Message)
            ? result.Error.Code
            : $"{result.Error.Code}: {result.Error.Message}";
    }

    private static PublishResultDto MapFromPost(Post post, bool success)
    {
        return new PublishResultDto(
            Success: success,
            ExternalId: post.PublishExternalId,
            ExternalUrl: post.PublishExternalUrl,
            ErrorCode: null,
            ErrorMessage: post.PublishLastError,
            RawMetadata: post.PublishProviderResponseMetadata);
    }
}

