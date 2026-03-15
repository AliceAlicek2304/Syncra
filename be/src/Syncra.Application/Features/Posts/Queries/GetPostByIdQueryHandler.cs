using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Posts.Queries;

public sealed class GetPostByIdQueryHandler : IRequestHandler<GetPostByIdQuery, PostDto?>
{
    private readonly IPostRepository _postRepository;

    public GetPostByIdQueryHandler(IPostRepository postRepository)
    {
        _postRepository = postRepository;
    }

    public async Task<PostDto?> Handle(GetPostByIdQuery request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null || post.WorkspaceId != request.WorkspaceId)
        {
            return null;
        }

        return PostMapper.ToDto(post);
    }
}