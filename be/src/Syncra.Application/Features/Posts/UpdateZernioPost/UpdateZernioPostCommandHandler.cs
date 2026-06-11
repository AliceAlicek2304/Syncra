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

namespace Syncra.Application.Features.Posts.UpdateZernioPost;

public sealed class UpdateZernioPostCommandHandler : IRequestHandler<UpdateZernioPostCommand, PostDto>
{
    private readonly IZernioClient _zernioClient;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IPostRepository _postRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IStorageService _storageService;
    private readonly WasabiOptions _wasabiOptions;

    public UpdateZernioPostCommandHandler(
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

    public async Task<PostDto> Handle(UpdateZernioPostCommand request, CancellationToken cancellationToken)
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
                if (string.IsNullOrEmpty(mediaItem.Url))
                {
                    throw new DomainException("invalid_media", "Media item URL is required.");
                }

                // Nếu URL đã là Zernio public URL thì dùng luôn
                if (mediaItem.Url.Contains("zernio", StringComparison.OrdinalIgnoreCase))
                {
                    updatedMediaItems.Add(mediaItem);
                    continue;
                }

                var storageKey = ExtractStorageKey(mediaItem.Url);
                using var stream = await _storageService.OpenReadAsync(storageKey);

                var resolvedMimeType = GetMimeType(mediaItem.Filename ?? mediaItem.Url ?? "file", mediaItem.MimeType);

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

        var post = await _postRepository.GetByZernioPostIdAsync(request.PostId);

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
            updatedMediaItems.Count > 0 ? updatedMediaItems : request.MediaItems,
            request.PlatformContents,
            request.PostId,
            post?.Status.ToString().ToLowerInvariant(),
            request.PlatformSpecificData,
            request.TiktokSettings);

        var zernioResult = await _zernioClient.UpdatePostAsync(zernioRequest, cancellationToken);

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

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return PostMapper.ToDto(post);
        }

        // Build DTO from request if no local post
        return PostMapper.ToDto(
            request.WorkspaceId,
            request.Title ?? string.Empty,
            request.Content ?? string.Empty,
            request.PostId,
            request.ScheduledAtUtc,
            request.IsDraft ?? false);
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
