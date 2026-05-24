using MediatR;
using Syncra.Application.DTOs.Posts;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Posts.Queries;

public sealed class GetScheduledPostsCountQueryHandler
    : IRequestHandler<GetScheduledPostsCountQuery, ScheduledPostsCountDto>
{
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IPostRepository _postRepository;

    public GetScheduledPostsCountQueryHandler(
        ISocialAccountRepository socialAccountRepository,
        IPostRepository postRepository)
    {
        _socialAccountRepository = socialAccountRepository;
        _postRepository = postRepository;
    }

    public async Task<ScheduledPostsCountDto> Handle(
        GetScheduledPostsCountQuery request,
        CancellationToken cancellationToken)
    {
        var account = await _socialAccountRepository.GetByIdAsync(request.SocialAccountId);
        if (account is null || account.WorkspaceId != request.WorkspaceId)
        {
            throw new DomainException("not_found", "Social account not found.");
        }

        var count = await _postRepository.CountScheduledPostsForZernioAccountAsync(
            request.WorkspaceId,
            account.ExternalAccountId,
            cancellationToken);

        return new ScheduledPostsCountDto(count);
    }
}
