using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxPostCommentsQueryHandler
    : IRequestHandler<GetInboxPostCommentsQuery, ZernioPostCommentsResponseDto>
{
    private readonly IZernioClient _zernioClient;

    public GetInboxPostCommentsQueryHandler(IZernioClient zernioClient)
    {
        _zernioClient = zernioClient;
    }

    public async Task<ZernioPostCommentsResponseDto> Handle(
        GetInboxPostCommentsQuery request,
        CancellationToken cancellationToken)
    {
        return await _zernioClient.GetInboxPostCommentsAsync(
            request.ZernioPostId,
            request.AccountId,
            request.Subreddit,
            request.Limit,
            request.Cursor,
            request.CommentId,
            cancellationToken);
    }
}
