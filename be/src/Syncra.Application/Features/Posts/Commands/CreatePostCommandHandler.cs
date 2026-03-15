using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class CreatePostCommandHandler : IRequestHandler<CreatePostCommand, PostDto>
{
    private readonly IPostRepository _postRepository;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreatePostCommandHandler(
        IPostRepository postRepository,
        IMediaRepository mediaRepository,
        IUnitOfWork unitOfWork)
    {
        _postRepository = postRepository;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<PostDto> Handle(CreatePostCommand request, CancellationToken cancellationToken)
    {
        // Use domain entity factory method
        var post = Post.Create(
            request.WorkspaceId,
            request.UserId,
            request.Title,
            request.Content,
            request.ScheduledAtUtc,
            request.IntegrationId);

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

        return PostMapper.ToDto(post);
    }
}