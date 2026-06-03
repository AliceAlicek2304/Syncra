using MediatR;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Inbox.Queries;

public sealed class GetInboxMessagesQueryHandler
    : IRequestHandler<GetInboxMessagesQuery, IReadOnlyList<InboxMessageDto>>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public GetInboxMessagesQueryHandler(
        IInboxRepository inboxRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _inboxRepository = inboxRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<InboxMessageDto>> Handle(
        GetInboxMessagesQuery request,
        CancellationToken cancellationToken)
    {
        var conversation = await _inboxRepository.GetConversationByIdAsync(
            request.WorkspaceId,
            request.ConversationId,
            cancellationToken);

        if (conversation == null)
        {
            throw new DomainException(
                "ConversationNotFound",
                $"InboxConversation '{request.ConversationId}' not found in workspace '{request.WorkspaceId}'.");
        }

        if (conversation.SocialAccount == null || string.IsNullOrEmpty(conversation.SocialAccount.ExternalAccountId))
        {
            throw new DomainException(
                "SocialAccountMissing",
                $"Social account is missing or not linked properly for conversation '{conversation.Id}'.");
        }

        string? cursor = request.Before?.ToString("o");

        var zernioResult = await _zernioClient.ListInboxMessagesAsync(
            conversation.ZernioConversationId,
            conversation.SocialAccount.ExternalAccountId,
            cursor,
            cancellationToken);

        var resultList = new List<InboxMessageDto>();

        foreach (var item in zernioResult.Items)
        {
            var localMessage = await _inboxRepository.GetMessageByZernioIdAsync(
                request.WorkspaceId,
                item.Id,
                cancellationToken);

            string direction = string.Equals(item.Direction, "outgoing", StringComparison.OrdinalIgnoreCase)
                ? "Outbound"
                : "Inbound";

            if (localMessage == null)
            {
                localMessage = InboxMessage.Create(
                    request.WorkspaceId,
                    conversation.Id,
                    item.Id,
                    direction,
                    item.Text,
                    (item.SentAt == null || item.SentAt == default(DateTime)) ? DateTime.UtcNow : item.SentAt.Value,
                    conversation.SocialAccount?.ExternalAccountId
                );
                await _inboxRepository.AddMessageAsync(localMessage);
            }
            else
            {
                localMessage.UpdateBodyText(item.Text ?? string.Empty);
            }

            resultList.Add(new InboxMessageDto(
                localMessage.Id,
                localMessage.InboxConversationId,
                localMessage.ZernioMessageId,
                localMessage.Direction,
                localMessage.BodyText,
                localMessage.SentAtUtc,
                conversation.SocialAccount?.ExternalAccountId,
                localMessage.CreatedAtUtc
            ));
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return resultList;
    }
}
