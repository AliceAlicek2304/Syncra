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
    private static readonly TimeSpan ThreadTtl = TimeSpan.FromMinutes(5);

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

        var postEntity = await _inboxRepository.GetCommentedPostByZernioPostIdAsync(
            request.WorkspaceId, request.ZernioPostId, cancellationToken);
        var isAd = postEntity?.IsAd == true;

        ZernioPostCommentsResponseDto response;

        if (!request.ForceRefresh && cached != null && cached.ExpiresAtUtc > DateTime.UtcNow)
        {
            var deserialized = JsonSerializer.Deserialize<ZernioPostCommentsResponseDto>(cached.PayloadJson);
            if (deserialized != null && deserialized.Pagination != null)
            {
                response = deserialized;
            }
            else
            {
                response = await FetchLiveAndCacheAsync(request, postEntity, cancellationToken);
            }
        }
        else
        {
            response = await FetchLiveAndCacheAsync(request, postEntity, cancellationToken);
        }

        var allCommentIds = ExtractCommentIds(response.Comments);
        var privateReplies = allCommentIds.Count > 0
            ? await _inboxRepository.GetPrivateRepliesByCommentIdsAsync(request.WorkspaceId, allCommentIds, cancellationToken)
            : Array.Empty<InboxCommentPrivateReply>();
        var repliedCommentIds = new HashSet<string>(privateReplies.Select(pr => pr.ZernioCommentId));

        if (response.Comments != null)
        {
            var updatedComments = PopulateCommentsMetadata(response.Comments, repliedCommentIds, isAd);
            response = response with { Comments = updatedComments };
        }

        return response;
    }

    private static HashSet<string> ExtractCommentIds(IReadOnlyList<ZernioPostCommentItemDto>? comments)
    {
        var ids = new HashSet<string>();
        if (comments == null) return ids;
        foreach (var c in comments)
        {
            ids.Add(c.Id);
            if (c.Replies?.Count > 0)
            {
                ids.UnionWith(ExtractCommentIds(c.Replies));
            }
        }
        return ids;
    }

    private static IReadOnlyList<ZernioPostCommentItemDto> PopulateCommentsMetadata(
        IReadOnlyList<ZernioPostCommentItemDto>? comments,
        HashSet<string> repliedCommentIds,
        bool isAd)
    {
        if (comments == null) return Array.Empty<ZernioPostCommentItemDto>();

        var list = new List<ZernioPostCommentItemDto>();
        foreach (var c in comments)
        {
            var updatedReplies = PopulateCommentsMetadata(c.Replies, repliedCommentIds, isAd);
            var hasSentPrivateReply = repliedCommentIds.Contains(c.Id);
            list.Add(c with
            {
                Replies = updatedReplies,
                HasSentPrivateReply = hasSentPrivateReply,
                IsAd = isAd ? true : c.IsAd
            });
        }
        return list;
    }

    private async Task<ZernioPostCommentsResponseDto> FetchLiveAndCacheAsync(
        GetInboxPostCommentsQuery request,
        InboxCommentedPost? postEntity,
        CancellationToken cancellationToken)
    {
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

        if (postEntity == null)
        {
            var newPost = InboxCommentedPost.Create(
                request.WorkspaceId,
                request.ZernioPostId,
                socialAccountId: null,
                platform: request.Platform ?? "facebook",
                zernioAccountId: request.AccountId,
                receivedAtUtc: DateTime.UtcNow
            );
            await _inboxRepository.AddCommentedPostAsync(newPost);
        }

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
