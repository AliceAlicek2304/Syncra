using MediatR;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
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
                var storageKey = ExtractStorageKey(mediaItem.Url);
                using var stream = await _storageService.OpenReadAsync(storageKey);
                
                var zernioPublicUrl = await _zernioClient.UploadMediaToZernioAsync(
                    stream,
                    mediaItem.MimeType ?? "application/octet-stream",
                    mediaItem.Filename ?? "file",
                    cancellationToken);

                updatedMediaItems.Add(new PostMediaItemDto(
                    Url: zernioPublicUrl,
                    Type: mediaItem.Type,
                    Filename: mediaItem.Filename,
                    MimeType: mediaItem.MimeType));
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
            request.PlatformContents);

        // Send to Zernio API
        var zernioResult = await _zernioClient.CreatePostAsync(zernioRequest, cancellationToken);

        // Create Post entity using factory method
        var post = Post.Create(
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
}
