using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;

namespace Syncra.Application.Features.Posts.Commands;

public sealed class PublishPostCommandHandler : IRequestHandler<PublishPostCommand, PostDto>
{
    private readonly IPostRepository _postRepository;
    private readonly IPublishService _publishService;
    private readonly IUnitOfWork _unitOfWork;

    public PublishPostCommandHandler(
        IPostRepository postRepository,
        IPublishService publishService,
        IUnitOfWork unitOfWork)
    {
        _postRepository = postRepository;
        _publishService = publishService;
        _unitOfWork = unitOfWork;
    }

    public async Task<PostDto> Handle(PublishPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null || post.WorkspaceId != request.WorkspaceId)
        {
            throw new DomainException("not_found", "Post not found in the specified workspace.");
        }

        // Use domain behavior to check if post can be published
        if (!post.CanBePublished())
        {
            throw new DomainException(
                "invalid_state",
                "Post cannot be published. It must be in Draft or Scheduled status, have an integration, and not be scheduled for the future.");
        }

        if (request.DryRun)
        {
            // Just validate without actually publishing
            return PostMapper.ToDto(post);
        }

        // Call the publish service (which uses domain behaviors internally)
        await _publishService.PublishAsync(
            request.WorkspaceId,
            request.PostId,
            request.UserId,
            false,
            cancellationToken);

        // Reload post to get updated state
        post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null)
        {
            throw new DomainException("not_found", "Post not found after publishing.");
        }

        return PostMapper.ToDto(post);
    }
}