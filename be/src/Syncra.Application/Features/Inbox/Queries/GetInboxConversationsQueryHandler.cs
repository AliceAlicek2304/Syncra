using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxConversationsQueryHandler
    : IRequestHandler<GetInboxConversationsQuery, IReadOnlyList<InboxConversationDto>>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioProfileRepository _profileRepository;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public GetInboxConversationsQueryHandler(
        IInboxRepository inboxRepository,
        IZernioProfileRepository profileRepository,
        ISocialAccountRepository socialAccountRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _profileRepository = profileRepository;
        _socialAccountRepository = socialAccountRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<InboxConversationDto>> Handle(
        GetInboxConversationsQuery request,
        CancellationToken cancellationToken)
    {
        var profile = await _profileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        if (profile == null)
        {
            return Array.Empty<InboxConversationDto>();
        }

        var zernioResult = await _zernioClient.ListInboxConversationsAsync(
            profile.ZernioProfileId,
            cancellationToken: cancellationToken);

        var socialAccounts = await _socialAccountRepository.GetByWorkspaceIdAsync(request.WorkspaceId);
        var resultList = new List<InboxConversationDto>();

        foreach (var item in zernioResult.Items)
        {
            var socialAccount = socialAccounts.FirstOrDefault(sa => sa.ExternalAccountId == item.AccountId);
            
            var localConvo = await _inboxRepository.GetConversationByZernioIdAsync(
                request.WorkspaceId,
                item.Id,
                cancellationToken);

            if (localConvo == null)
            {
                localConvo = InboxConversation.Create(
                    request.WorkspaceId,
                    item.Id,
                    socialAccount?.Id ?? Guid.Empty,
                    item.Platform,
                    item.ParticipantName ?? "Contact",
                    item.ParticipantPicture,
                    item.LastMessageText,
                    item.LastMessageAt
                );
                await _inboxRepository.AddConversationAsync(localConvo);
            }
            else
            {
                localConvo.UpdateLastMessage(item.LastMessageText, item.LastMessageAt);
            }

            resultList.Add(new InboxConversationDto(
                localConvo.Id,
                item.Id,
                item.Platform,
                item.ParticipantName,
                item.ParticipantPicture,
                item.LastMessageText,
                item.LastMessageAt,
                item.UnreadCount ?? 0,
                (item.UnreadCount ?? 0) == 0,
                socialAccount?.Id,
                localConvo.CreatedAtUtc
            ));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return resultList;
    }
}
