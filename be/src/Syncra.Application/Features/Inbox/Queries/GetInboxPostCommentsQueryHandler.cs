using System.Text.Json;
using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxPostCommentsQueryHandler
    : IRequestHandler<GetInboxPostCommentsQuery, ZernioPostCommentsResponseDto>
{
    private static readonly TimeSpan ThreadTtl = TimeSpan.FromHours(24);

    private readonly IZernioClient _zernioClient;
    private readonly IInboxRepository _inboxRepository;

    public GetInboxPostCommentsQueryHandler(
        IZernioClient zernioClient,
        IInboxRepository inboxRepository)
    {
        _zernioClient = zernioClient;
        _inboxRepository = inboxRepository;
    }

    public async Task<ZernioPostCommentsResponseDto> Handle(
        GetInboxPostCommentsQuery request,
        CancellationToken cancellationToken)
    {
        var cached = await _inboxRepository.GetByPostAsync(
            request.WorkspaceId,
            request.ZernioPostId,
            cancellationToken);

        if (cached != null && cached.ExpiresAtUtc > DateTime.UtcNow)
        {
            var deserialized = JsonSerializer.Deserialize<ZernioPostCommentsResponseDto>(cached.PayloadJson);
            if (deserialized != null)
            {
                return deserialized;
            }
        }

        var live = await _zernioClient.GetInboxPostCommentsAsync(
            request.ZernioPostId,
            request.AccountId,
            request.Subreddit,
            request.Limit,
            request.Cursor,
            request.CommentId,
            request.SelfAccountId,
            request.Platform,
            cancellationToken);

        var payloadJson = JsonSerializer.Serialize(live);
        var threadEntity = InboxCommentThread.Create(
            request.WorkspaceId,
            request.ZernioPostId,
            payloadJson,
            expiresAtUtc: DateTime.UtcNow.Add(ThreadTtl));

        await _inboxRepository.UpsertAsync(threadEntity);

        return live;
    }
}
