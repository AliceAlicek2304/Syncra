using MediatR;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.CreateZernioPost;

public sealed class CreateZernioPostCommandHandler : IRequestHandler<CreateZernioPostCommand, PostDto>
{
    private readonly IZernioClient _zernioClient;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IStorageService _storageService;
    private readonly WasabiOptions _wasabiOptions;

    public CreateZernioPostCommandHandler(
        IZernioClient zernioClient,
        ISocialAccountRepository socialAccountRepository,
        IZernioProfileRepository zernioProfileRepository,
        IPostRepository postRepository,
        IUnitOfWork unitOfWork,
        IStorageService storageService,
        IOptions<WasabiOptions> wasabiOptions)
    {
        _zernioClient = zernioClient;
        _socialAccountRepository = socialAccountRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
        _storageService = storageService;
        _wasabiOptions = wasabiOptions.Value;
    }

    public async Task<PostDto> Handle(CreateZernioPostCommand request, CancellationToken cancellationToken)
    {
        var socialAccountIds = request.SocialAccountIds ?? Array.Empty<Guid>();
        if (socialAccountIds.Count == 0)
        {
            if (request.PublishNow || request.ScheduledAtUtc.HasValue)
            {
                throw new DomainException("invalid_account", "At least one social account is required for scheduled or immediate publishing.");
            }
        }

        var activeAccounts = new List<SocialAccount>();
        if (socialAccountIds.Count > 0)
        {
            var socialAccounts = await _socialAccountRepository.GetByIdsAsync(socialAccountIds);
            activeAccounts = socialAccounts
                .Where(a => a.WorkspaceId == request.WorkspaceId && a.IsActive)
                .ToList();

            if (activeAccounts.Count != socialAccountIds.Count)
            {
                throw new DomainException("invalid_account", "One or more accounts are not connected to this workspace.");
            }
        }

        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile is null)
        {
            throw new DomainException("zernio_profile_missing", "No Zernio profile exists for this workspace.");
        }

        // Upload media files to Zernio if present
        var updatedMediaItems = new List<PostMediaItemDto>();
        if (request.MediaItems != null)
        {
            foreach (var mediaItem in request.MediaItems)
            {
                if (!string.IsNullOrEmpty(mediaItem.Url) && 
                    mediaItem.Url.Contains("zernio.com", StringComparison.OrdinalIgnoreCase))
                {
                    updatedMediaItems.Add(mediaItem);
                    continue;
                }

                var storageKey = ExtractStorageKey(mediaItem.Url);
                using var stream = await _storageService.OpenReadAsync(storageKey);
                
                var resolvedMimeType = GetMimeType(mediaItem.Filename ?? mediaItem.Url ?? "file", mediaItem.MimeType);

                var zernioPublicUrl = await _zernioClient.UploadMediaToZernioAsync(
                    stream,
                    resolvedMimeType,
                    mediaItem.Filename ?? "file",
                    cancellationToken);

                updatedMediaItems.Add(new PostMediaItemDto(
                    Url: zernioPublicUrl,
                    Type: mediaItem.Type,
                    Filename: mediaItem.Filename,
                    MimeType: resolvedMimeType));
            }
        }

        Post? post = null;
        if (!string.IsNullOrEmpty(request.PostId))
        {
            post = await _postRepository.GetByZernioPostIdAsync(request.PostId);
            if (post is null)
            {
                throw new DomainException("post_not_found", $"Post with Zernio ID {request.PostId} was not found.");
            }
        }

        // Build the Zernio API request
        var platforms = activeAccounts
            .Select(a => new ZernioCreatePostPlatformTarget(a.Platform, a.ExternalAccountId))
            .ToList();

        var zernioRequest = new ZernioCreatePostRequest(
            request.Title,
            request.Content ?? string.Empty,
            platforms,
            request.ScheduledAtUtc,
            request.PublishNow,
            request.IsDraft,
            updatedMediaItems.Count > 0 ? updatedMediaItems : request.MediaItems,
            request.PlatformContents,
            request.PostId,
            post?.Status.ToString().ToLowerInvariant(),
            request.PlatformSpecificData,
            request.TiktokSettings,
            request.FacebookSettings);

        // Send to Zernio API (create or update based on request.PostId)
        var zernioResult = await _zernioClient.CreatePostAsync(zernioRequest, cancellationToken);

        if (post is not null)
        {
            if (post.Status == PostStatus.Published)
            {
                post.UpdatePublishedContent(request.Title ?? string.Empty, request.Content ?? string.Empty);
            }
            else
            {
                post.UpdateContent(request.Title ?? string.Empty, request.Content ?? string.Empty);

                if (request.ScheduledAtUtc.HasValue)
                {
                    post.Schedule(request.ScheduledAtUtc.Value);
                }
                else if (post.Status == PostStatus.Scheduled)
                {
                    post.Unschedule();
                }

                if (request.PublishNow)
                {
                    post.MarkPublishAttempt(DateTime.UtcNow);
                }
                else if (request.IsDraft == true)
                {
                    if (post.Status == PostStatus.Scheduled)
                    {
                        post.Unschedule();
                    }
                    else if (post.Status is PostStatus.Failed or PostStatus.Partial)
                    {
                        post.Retry();
                    }
                }
            }

            post.AssignZernioPost(zernioResult.ZernioPostId, socialAccountIds.Count);

            // Sync platform targets in post:
            post.PlatformTargets.Clear();
            foreach (var account in activeAccounts)
            {
                var target = PostPlatformTarget.Create(
                    request.WorkspaceId,
                    post.Id,
                    account.Platform);

                target.SetZernioAccountId(account.ExternalAccountId);

                post.PlatformTargets.Add(target);
                _postRepository.AddPlatformTarget(target);
            }
        }
        else
        {
            // Create Post entity using factory method
            post = Post.Create(
                request.WorkspaceId,
                request.UserId,
                request.Title ?? string.Empty,
                request.Content ?? string.Empty,
                request.ScheduledAtUtc,
                integrationId: null);

            post.AssignZernioPost(zernioResult.ZernioPostId, socialAccountIds.Count);

            // If publishing immediately, transition to Publishing status
            if (request.PublishNow)
            {
                post.MarkPublishAttempt(DateTime.UtcNow);
            }

            // Persist the post
            await _postRepository.AddAsync(post);

            // Create PostPlatformTarget entities for each social account
            foreach (var account in activeAccounts)
            {
                var target = PostPlatformTarget.Create(
                    request.WorkspaceId,
                    post.Id,
                    account.Platform);

                target.SetZernioAccountId(account.ExternalAccountId);

                post.PlatformTargets.Add(target);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return PostMapper.ToDto(post);
    }

    private string ExtractStorageKey(string fileUrl)
    {
        var prefix = $"{_wasabiOptions.ServiceUrl.TrimEnd('/')}/{_wasabiOptions.BucketName}/";
        if (!string.IsNullOrEmpty(_wasabiOptions.BucketName) && fileUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return fileUrl[prefix.Length..];

        return System.IO.Path.GetFileName(fileUrl);
    }

    private static string GetMimeType(string filename, string? providedMimeType)
    {
        if (!string.IsNullOrWhiteSpace(providedMimeType) && 
            providedMimeType != "application/octet-stream")
        {
            return providedMimeType;
        }

        var extension = System.IO.Path.GetExtension(filename).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".mp4" => "video/mp4",
            ".mov" => "video/quicktime",
            ".webm" => "video/webm",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}
