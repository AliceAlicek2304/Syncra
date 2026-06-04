using MediatR;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Exceptions;
using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Features.Inbox.Commands;

public sealed class SendInboxMessageCommandHandler
    : IRequestHandler<SendInboxMessageCommand, SendInboxMessageResponse>
{
    private readonly IInboxRepository _inboxRepository;
    private readonly IZernioProfileRepository _profileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IStorageService _storageService;
    private readonly WasabiOptions _wasabiOptions;

    public SendInboxMessageCommandHandler(
        IInboxRepository inboxRepository,
        IZernioProfileRepository profileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork,
        IStorageService storageService,
        IOptions<WasabiOptions> wasabiOptions)
    {
        _inboxRepository = inboxRepository;
        _profileRepository = profileRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
        _storageService = storageService;
        _wasabiOptions = wasabiOptions.Value;
    }

    public async Task<SendInboxMessageResponse> Handle(
        SendInboxMessageCommand request,
        CancellationToken cancellationToken)
    {
        // Verify conversation exists and belongs to workspace
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

        // Resolve ZernioProfile to get the external profile ID for the API call
        var profile = await _profileRepository.GetByWorkspaceIdAsync(
            request.WorkspaceId);

        if (profile == null)
        {
            throw new DomainException(
                "ZernioProfileNotFound",
                $"No ZernioProfile found for workspace '{request.WorkspaceId}'. Connect a Zernio account first.");
        }

        var zernioRequest = request.Request;

        // If there's an attachment, upload it to Zernio to bypass any robots.txt or localhost access restrictions by Meta
        if (!string.IsNullOrEmpty(zernioRequest.AttachmentUrl) &&
            !zernioRequest.AttachmentUrl.Contains("zernio", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                // Extract filename from URL
                var fileName = "attachment";
                if (Uri.TryCreate(zernioRequest.AttachmentUrl, UriKind.Absolute, out var uri))
                {
                    var lastSegment = Path.GetFileName(uri.LocalPath);
                    if (!string.IsNullOrEmpty(lastSegment))
                    {
                        fileName = lastSegment;
                    }
                }

                var storageKey = ExtractStorageKey(zernioRequest.AttachmentUrl);
                using var stream = await _storageService.OpenReadAsync(storageKey);

                var resolvedMimeType = GetMimeType(fileName, null);

                // Upload trực tiếp qua /v1/media/upload-direct (1 call, contentType mở — không bị whitelist 13 types).
                // URL trả về dùng làm attachmentUrl cho Send Message.
                var uploadResult = await _zernioClient.UploadMediaDirectAsync(
                    stream,
                    fileName,
                    resolvedMimeType,
                    cancellationToken);

                // Update request with Zernio's hosted URL
                zernioRequest = zernioRequest with { AttachmentUrl = uploadResult.Url };
            }
            catch (Exception ex) when (ex is not DomainException)
            {
                throw new DomainException(
                    "AttachmentUploadFailed",
                    "Failed to retrieve attachment from storage and upload to Zernio storage.",
                    ex);
            }
        }

        // Send via Zernio API
        var zernioResult = await _zernioClient.SendInboxMessageAsync(
            profile.ZernioProfileId,
            conversation.ZernioConversationId,
            zernioRequest,
            cancellationToken);

        var bodyText = zernioRequest.Text ?? zernioRequest.AttachmentUrl ?? "[Media/Interactive]";

        // Persist to local DB
        var message = InboxMessage.Create(
            request.WorkspaceId,
            request.ConversationId,
            zernioResult.MessageId,
            "Outbound",
            bodyText,
            zernioResult.SentAtUtc,
            zernioRequest.AccountId);

        await _inboxRepository.AddMessageAsync(message);

        // Update conversation last message
        conversation.UpdateLastMessage(bodyText, zernioResult.SentAtUtc);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SendInboxMessageResponse(
            zernioResult.MessageId,
            zernioResult.SentAtUtc);
    }

    private string ExtractStorageKey(string fileUrl)
    {
        var prefix = $"{_wasabiOptions.ServiceUrl.TrimEnd('/')}/{_wasabiOptions.BucketName}/";
        if (!string.IsNullOrEmpty(_wasabiOptions.BucketName) && fileUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return fileUrl[prefix.Length..];

        return System.IO.Path.GetFileName(fileUrl);
    }

    private static string GetMimeType(string filename, string? providedMimeType)
    {
        if (!string.IsNullOrWhiteSpace(providedMimeType) && 
            providedMimeType != "application/octet-stream")
        {
            return providedMimeType;
        }

        var extension = System.IO.Path.GetExtension(filename).ToLowerInvariant();
        return extension switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".mp4" => "video/mp4",
            ".mov" => "video/quicktime",
            ".webm" => "video/webm",
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".m4a" => "audio/x-m4a",
            ".ogg" => "audio/ogg",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt" => "text/plain",
            _ => "application/octet-stream"
        };
    }
}