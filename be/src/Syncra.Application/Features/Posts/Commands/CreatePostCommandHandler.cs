using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Enums;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class CreatePostCommandHandler : IRequestHandler<CreatePostCommand, PostDto>
{
    private readonly IPostRepository _postRepository;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IStorageService _storageService;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IActivityEventService _activityEventService;

    public CreatePostCommandHandler(
        IPostRepository postRepository,
        IMediaRepository mediaRepository,
        IUnitOfWork unitOfWork,
        IStorageService storageService,
        ISubscriptionRepository subscriptionRepository,
        IActivityEventService activityEventService)
    {
        _postRepository = postRepository;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
        _storageService = storageService;
        _subscriptionRepository = subscriptionRepository;
        _activityEventService = activityEventService;
    }

    public async Task<PostDto> Handle(CreatePostCommand request, CancellationToken cancellationToken)
    {
        // Enforce monthly post limits
        var subscription = await _subscriptionRepository.GetCurrentForWorkspaceAsync(request.WorkspaceId);
        if (subscription == null || subscription.Plan == null)
        {
            throw new DomainException(
                "subscription_required",
                "An active or trialing subscription is required to schedule posts.");
        }

        if (subscription.Status == SubscriptionStatus.Expired || 
            (subscription.Status != SubscriptionStatus.Active && subscription.Status != SubscriptionStatus.Trialing))
        {
            throw new DomainException(
                "subscription_expired",
                "Your subscription has expired or is inactive. Please renew your plan to continue scheduling posts.");
        }

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1).AddTicks(-1);

        var postCount = await _postRepository.CountPostsCreatedInMonthAsync(request.WorkspaceId, monthStart, monthEnd, cancellationToken);
        if (postCount >= subscription.Plan.MaxScheduledPostsPerMonth)
        {
            throw new DomainException(
                "plan_limit_exceeded",
                $"You have reached the monthly post limit for your plan ({subscription.Plan.MaxScheduledPostsPerMonth} posts). Upgrade your subscription to create more posts.");
        }

        // Use domain entity factory method
        var post = Post.Create(
            request.WorkspaceId,
            request.UserId,
            request.Title,
            request.Content,
            request.ScheduledAtUtc);

        // Attach media using domain behavior
        if (request.MediaIds != null && request.MediaIds.Count > 0)
        {
            var mediaItems = await _mediaRepository.GetByIdsAsync(request.MediaIds);
            foreach (var media in mediaItems)
            {
                post.AddMedia(media);
            }
        }

        await _postRepository.AddAsync(post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        await _activityEventService.RecordAsync(new ActivityEventRequest(
            EventType: request.ScheduledAtUtc.HasValue ? "post.scheduled" : "post.created",
            EventGroup: "post",
            Status: "success",
            Title: request.ScheduledAtUtc.HasValue ? "Post scheduled" : "Post created",
            Description: request.Title,
            WorkspaceId: request.WorkspaceId,
            UserId: request.UserId,
            SubjectType: "Post",
            SubjectId: post.Id.ToString(),
            Metadata: new Dictionary<string, string?>
            {
                ["postId"] = post.Id.ToString(),
                ["scheduledAtUtc"] = request.ScheduledAtUtc?.ToString("O")
            }), cancellationToken);

        return PostMapper.ToDto(post, _storageService);
    }
}
