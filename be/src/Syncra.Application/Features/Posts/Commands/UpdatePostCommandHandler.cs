using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class UpdatePostCommandHandler : IRequestHandler<UpdatePostCommand, PostDto?>
{
    private readonly IPostRepository _postRepository;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly Syncra.Application.Interfaces.IZernioClient _zernioClient;

    public UpdatePostCommandHandler(
        IPostRepository postRepository,
        IMediaRepository mediaRepository,
        IUnitOfWork unitOfWork,
        Syncra.Application.Interfaces.IZernioClient zernioClient)
    {
        _postRepository = postRepository;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
        _zernioClient = zernioClient;
    }

    public async Task<PostDto?> Handle(UpdatePostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null || post.WorkspaceId != request.WorkspaceId)
        {
            return null;
        }

        // Use domain entity behavior for updating content
        post.UpdateContent(request.Title, request.Content);

        // Handle scheduling
        if (request.ScheduledAtUtc.HasValue)
        {
            post.Schedule(request.ScheduledAtUtc.Value);
        }
        else if (post.Status == PostStatus.Scheduled)
        {
            post.Unschedule();
        }

        // Handle status transition
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<PostStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            post.TransitionTo(newStatus);
        }

        // Handle media changes using domain behavior
        if (request.MediaIds != null)
        {
            post.ClearMedia();
            var mediaItems = await _mediaRepository.GetByIdsAsync(request.MediaIds);
            foreach (var media in mediaItems)
            {
                post.AddMedia(media);
            }
        }

        await _postRepository.UpdateAsync(post);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(post.ZernioPostId))
        {
            var updateRequest = new Syncra.Application.DTOs.Zernio.ZernioUpdatePostRequestDto(
                Content: post.Content.Value,
                ScheduledForUtc: post.ScheduledAt.IsNone ? null : post.ScheduledAt.UtcValue
            );
            await _zernioClient.UpdatePostAsync(post.ZernioPostId, updateRequest, cancellationToken);
        }

        return PostMapper.ToDto(post);
    }
}