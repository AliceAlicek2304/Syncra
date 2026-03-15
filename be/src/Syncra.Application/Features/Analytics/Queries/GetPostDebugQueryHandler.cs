using MediatR;
using Syncra.Application.DTOs.Analytics;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Analytics.Queries;

public sealed class GetPostDebugQueryHandler : IRequestHandler<GetPostDebugQuery, PostDebugDto?>
{
    private readonly IPostRepository _postRepository;

    public GetPostDebugQueryHandler(IPostRepository postRepository)
    {
        _postRepository = postRepository;
    }

    public async Task<PostDebugDto?> Handle(GetPostDebugQuery request, CancellationToken cancellationToken)
    {
        var post = await _postRepository.GetByIdAsync(request.PostId);
        if (post is null)
            return null;

        return new PostDebugDto(
            post.Id,
            post.WorkspaceId,
            post.WorkspaceId == request.WorkspaceId,
            post.Status.ToString(),
            post.PublishExternalId,
            post.PublishExternalUrl,
            post.IntegrationId,
            post.Integration?.Platform,
            post.Integration?.ExternalAccountId,
            !string.IsNullOrEmpty(post.Integration?.AccessToken),
            post.Integration?.ExpiresAtUtc,
            post.Integration?.IsActive);
    }
}
