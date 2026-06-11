using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.Queries;

public sealed class GetPostByIdQueryHandler : IRequestHandler<GetPostByIdQuery, PostDto?>
{
    private readonly IPostRepository _postRepository;
    private readonly IStorageService _storageService;

    public GetPostByIdQueryHandler(IPostRepository postRepository, IStorageService storageService)
    {
        _postRepository = postRepository;
        _storageService = storageService;
    }

    public async Task<PostDto?> Handle(GetPostByIdQuery request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdWithPlatformTargetsAsync(request.PostId);
        if (post is null || post.WorkspaceId != request.WorkspaceId)
        {
            return null;
        }

        return PostMapper.ToDto(post, _storageService);
    }
}
