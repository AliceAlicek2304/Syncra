using MediatR;
using Microsoft.Extensions.Options;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Media.Commands;

public class DeleteMediaCommandHandler : IRequestHandler<DeleteMediaCommand>
{
    private readonly IMediaRepository _mediaRepository;
    private readonly IStorageService _storageService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly WasabiOptions _wasabiOptions;

    public DeleteMediaCommandHandler(
        IMediaRepository mediaRepository,
        IStorageService storageService,
        IUnitOfWork unitOfWork,
        IOptions<WasabiOptions> wasabiOptions)
    {
        _mediaRepository = mediaRepository;
        _storageService = storageService;
        _unitOfWork = unitOfWork;
        _wasabiOptions = wasabiOptions.Value;
    }

    public async Task Handle(DeleteMediaCommand request, CancellationToken cancellationToken)
    {
        var media = await _mediaRepository.GetByIdAsync(request.MediaId);

        if (media == null || media.WorkspaceId != request.WorkspaceId)
            throw new DomainException("not_found", "Media not found.");

        if (media.PostId.HasValue)
            throw new DomainException("invalid_operation", "Cannot delete media that is attached to a post.");

        // Extract the S3 object key by stripping the ServiceUrl/BucketName prefix.
        // Falls back to the last URL segment for backward-compat with legacy local URLs.
        var storageKey = ExtractStorageKey(media.FileUrl);
        await _storageService.DeleteAsync(storageKey);

        await _mediaRepository.DeleteAsync(media.Id);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private string ExtractStorageKey(string fileUrl)
    {
        var prefix = $"{_wasabiOptions.ServiceUrl.TrimEnd('/')}/{_wasabiOptions.BucketName}/";
        string key;
        if (!string.IsNullOrEmpty(_wasabiOptions.BucketName) && fileUrl.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            key = fileUrl[prefix.Length..];
        }
        else
        {
            // Fallback: use the last path segment (legacy local storage behaviour)
            key = Path.GetFileName(fileUrl);
        }

        var queryIndex = key.IndexOf('?');
        if (queryIndex >= 0)
        {
            key = key[..queryIndex];
        }

        return key;
    }
}

