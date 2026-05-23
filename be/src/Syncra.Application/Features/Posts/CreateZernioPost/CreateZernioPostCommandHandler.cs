using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
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

    public CreateZernioPostCommandHandler(
        IZernioClient zernioClient,
        ISocialAccountRepository socialAccountRepository,
        IZernioProfileRepository zernioProfileRepository,
        IPostRepository postRepository,
        IUnitOfWork unitOfWork)
    {
        _zernioClient = zernioClient;
        _socialAccountRepository = socialAccountRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _postRepository = postRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<PostDto> Handle(CreateZernioPostCommand request, CancellationToken cancellationToken)
    {
        if (request.SocialAccountIds.Count == 0)
        {
            throw new DomainException("invalid_account", "At least one social account is required.");
        }

        var socialAccounts = await _socialAccountRepository.GetByIdsAsync(request.SocialAccountIds);
        var activeAccounts = socialAccounts
            .Where(a => a.WorkspaceId == request.WorkspaceId && a.IsActive)
            .ToList();

        if (activeAccounts.Count != request.SocialAccountIds.Count)
        {
            throw new DomainException("invalid_account", "One or more accounts are not connected to this workspace.");
        }

        var profile = await _zernioProfileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile is null)
        {
            throw new DomainException("zernio_profile_missing", "No Zernio profile exists for this workspace.");
        }

        // Build the Zernio API request
        var platforms = activeAccounts
            .Select(a => new ZernioCreatePostPlatformTarget(a.Platform, a.ExternalAccountId))
            .ToList();

        var zernioRequest = new ZernioCreatePostRequest(
            request.Content,
            platforms,
            request.ScheduledAtUtc,
            request.PublishNow);

        // Send to Zernio API
        var zernioResult = await _zernioClient.CreatePostAsync(zernioRequest, cancellationToken);

        // Create Post entity using factory method
        var post = Post.Create(
            request.WorkspaceId,
            request.UserId,
            request.Title,
            request.Content,
            request.ScheduledAtUtc,
            integrationId: null);

        post.AssignZernioPost(zernioResult.ZernioPostId, request.SocialAccountIds.Count);

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
}
