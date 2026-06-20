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

        var profile = request.ProfileId.HasValue
            ? await _zernioProfileRepository.GetByIdAsync(request.ProfileId.Value, cancellationToken)
            : await _zernioProfileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
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
                // Nếu URL đã là Zernio public URL thì dùng luôn
                if (!string.IsNullOrEmpty(mediaItem.Url) &&
                    mediaItem.Url.Contains("zernio", StringComparison.OrdinalIgnoreCase))
                {
                    updatedMediaItems.Add(mediaItem);
                    continue;
                }

                var storageKey = ExtractStorageKey(mediaItem.Url);
                using var stream = await _storageService.OpenReadAsync(storageKey);

                var resolvedMimeType = GetMimeType(mediaItem.Filename ?? "file", mediaItem.Url, mediaItem.MimeType);

                var presignResponse = await _zernioClient.GetMediaPresignedUrlAsync(
                    mediaItem.Filename ?? "file",
                    resolvedMimeType,
                    cancellationToken);

                // Upload stream lên Zernio presigned URL
                await _zernioClient.UploadMediaToZernioAsync(
                    presignResponse.UploadUrl,
                    stream,
                    resolvedMimeType,
                    cancellationToken);

                updatedMediaItems.Add(new PostMediaItemDto(
                    Url: presignResponse.PublicUrl,
                    Type: mediaItem.Type,
                    Filename: mediaItem.Filename,
                    MimeType: resolvedMimeType));
            }
        }

        var mediaItemsToUse = updatedMediaItems.Count > 0 ? updatedMediaItems : (request.MediaItems ?? new List<PostMediaItemDto>());

        if (ShouldSplitForLinkedIn(mediaItemsToUse, activeAccounts))
        {
            var linkedinAccounts = activeAccounts.Where(a => a.Platform.Equals("linkedin", StringComparison.OrdinalIgnoreCase)).ToList();
            var otherAccounts = activeAccounts.Where(a => !a.Platform.Equals("linkedin", StringComparison.OrdinalIgnoreCase)).ToList();

            // 1. Post 1: LinkedIn-only
            var linkedinPlatforms = linkedinAccounts
                .Select(a => new ZernioCreatePostPlatformTarget(a.Platform, a.ExternalAccountId))
                .ToList();

            // Filter mediaItems: video items only
            var linkedinMediaItems = mediaItemsToUse.Where(m =>
                (m.Type != null && m.Type.Equals("video", StringComparison.OrdinalIgnoreCase)) ||
                (m.MimeType != null && m.MimeType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
            ).ToList();

            var linkedinPlatformContents = request.PlatformContents?
                .Where(pc => pc.Platform.Equals("linkedin", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var linkedinSpecificData = request.PlatformSpecificData != null
                ? new AllPlatformDataDto(LinkedIn: request.PlatformSpecificData.LinkedIn)
                : null;

            var zernioRequest1 = new ZernioCreatePostRequest(
                request.Title,
                request.Content ?? string.Empty,
                linkedinPlatforms,
                request.ScheduledAtUtc,
                request.PublishNow,
                request.IsDraft,
                linkedinMediaItems,
                linkedinPlatformContents,
                null,
                null,
                linkedinSpecificData,
                null);

            var zernioResult1 = await _zernioClient.CreatePostAsync(zernioRequest1, cancellationToken);

            var post1 = Post.Create(
                request.WorkspaceId,
                request.UserId,
                request.Title ?? string.Empty,
                request.Content ?? string.Empty,
                request.ScheduledAtUtc);

            post1.AssignZernioPost(zernioResult1.ZernioPostId, linkedinAccounts.Count);
            post1.MarkAsSplitVideoPost();

            if (request.PublishNow)
            {
                post1.MarkPublishAttempt(DateTime.UtcNow);
            }

            await _postRepository.AddAsync(post1);

            foreach (var account in linkedinAccounts)
            {
                var target = PostPlatformTarget.Create(
                    request.WorkspaceId,
                    post1.Id,
                    account.Platform);
                target.SetZernioAccountId(account.ExternalAccountId);
                post1.PlatformTargets.Add(target);
            }

            // 2. Post 2: Other platforms
            var otherPlatforms = otherAccounts
                .Select(a => new ZernioCreatePostPlatformTarget(a.Platform, a.ExternalAccountId))
                .ToList();

            var otherPlatformContents = request.PlatformContents?
                .Where(pc => !pc.Platform.Equals("linkedin", StringComparison.OrdinalIgnoreCase))
                .ToList();

            var otherSpecificData = request.PlatformSpecificData != null
                ? request.PlatformSpecificData with { LinkedIn = null }
                : null;

            // Handle TikTok truncation for Post 2
            var tiktokPlatformForSplit = otherPlatforms.FirstOrDefault(p => p.Platform.Equals("TikTok", StringComparison.OrdinalIgnoreCase));
            var otherZernioContent = tiktokPlatformForSplit != null && !string.IsNullOrEmpty(request.Content) && request.Content.Length > 90
                ? request.Content.Substring(0, 90)
                : request.Content ?? string.Empty;

            var zernioRequest2 = new ZernioCreatePostRequest(
                request.Title,
                otherZernioContent,
                otherPlatforms,
                request.ScheduledAtUtc,
                request.PublishNow,
                request.IsDraft,
                mediaItemsToUse,
                otherPlatformContents,
                null,
                null,
                otherSpecificData,
                request.TiktokSettings);

            var zernioResult2 = await _zernioClient.CreatePostAsync(zernioRequest2, cancellationToken);

            var post2 = Post.Create(
                request.WorkspaceId,
                request.UserId,
                request.Title ?? string.Empty,
                request.Content ?? string.Empty,
                request.ScheduledAtUtc);

            post2.AssignZernioPost(zernioResult2.ZernioPostId, otherAccounts.Count);
            post2.MarkAsSplitVideoPost();

            if (request.PublishNow)
            {
                post2.MarkPublishAttempt(DateTime.UtcNow);
            }

            await _postRepository.AddAsync(post2);

            foreach (var account in otherAccounts)
            {
                var target = PostPlatformTarget.Create(
                    request.WorkspaceId,
                    post2.Id,
                    account.Platform);
                target.SetZernioAccountId(account.ExternalAccountId);
                post2.PlatformTargets.Add(target);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return PostMapper.ToDto(post2, _storageService);
        }

        // Build the Zernio API request
        var platforms = activeAccounts
            .Select(a => new ZernioCreatePostPlatformTarget(a.Platform, a.ExternalAccountId))
            .ToList();

        // Truncate content to 90 characters if TikTok is in the platforms list (TikTok photo posts use content as slideshow title)
        var tiktokPlatform = platforms.FirstOrDefault(p => p.Platform.Equals("TikTok", StringComparison.OrdinalIgnoreCase));
        var zernioContent = tiktokPlatform != null && !string.IsNullOrEmpty(request.Content) && request.Content.Length > 90
            ? request.Content.Substring(0, 90)
            : request.Content ?? string.Empty;

        var zernioRequest = new ZernioCreatePostRequest(
            request.Title,
            zernioContent,
            platforms,
            request.ScheduledAtUtc,
            request.PublishNow,
            request.IsDraft,
            mediaItemsToUse,
            request.PlatformContents,
            null,
            null,
            request.PlatformSpecificData,
            request.TiktokSettings);

        // Send to Zernio API (create only)
        var zernioResult = await _zernioClient.CreatePostAsync(zernioRequest, cancellationToken);

        // Create Post entity using factory method
        var post = Post.Create(
            request.WorkspaceId,
            request.UserId,
            request.Title ?? string.Empty,
            request.Content ?? string.Empty,
            request.ScheduledAtUtc);

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

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return PostMapper.ToDto(post, _storageService);
    }

    private static bool ShouldSplitForLinkedIn(
        IReadOnlyList<PostMediaItemDto>? mediaItems,
        List<SocialAccount> accounts)
    {
        if (mediaItems == null || mediaItems.Count == 0)
        {
            return false;
        }

        var hasVideo = mediaItems.Any(m =>
            (m.Type != null && m.Type.Equals("video", StringComparison.OrdinalIgnoreCase)) ||
            (m.MimeType != null && m.MimeType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
        );

        if (!hasVideo)
        {
            return false;
        }

        var hasLinkedIn = accounts.Any(a => a.Platform.Equals("linkedin", StringComparison.OrdinalIgnoreCase));
        var hasOtherPlatforms = accounts.Any(a => !a.Platform.Equals("linkedin", StringComparison.OrdinalIgnoreCase));

        return hasLinkedIn && hasOtherPlatforms;
    }

    private string ExtractStorageKey(string fileUrl)
    {
        var prefix = $"{_wasabiOptions.ServiceUrl.TrimEnd('/')}/{_wasabiOptions.BucketName}/";
        string key;
        if (!string.IsNullOrEmpty(_wasabiOptions.BucketName) && fileUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            key = fileUrl[prefix.Length..];
        }
        else
        {
            key = System.IO.Path.GetFileName(fileUrl);
        }

        var queryIndex = key.IndexOf('?');
        if (queryIndex >= 0)
        {
            key = key[..queryIndex];
        }

        return key;
    }

    private static string GetMimeType(string filename, string? url, string? providedMimeType)
    {
        if (!string.IsNullOrWhiteSpace(providedMimeType) && 
            providedMimeType != "application/octet-stream")
        {
            return providedMimeType;
        }

        var extension = System.IO.Path.GetExtension(filename).ToLowerInvariant();
        if (string.IsNullOrEmpty(extension) && !string.IsNullOrEmpty(url))
        {
            var cleanUrl = url;
            var queryIndex = cleanUrl.IndexOf('?');
            if (queryIndex >= 0)
            {
                cleanUrl = cleanUrl[..queryIndex];
            }
            extension = System.IO.Path.GetExtension(cleanUrl).ToLowerInvariant();
        }

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
