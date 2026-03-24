using MediatR;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Media;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using MediaEntity = Syncra.Domain.Entities.Media;

namespace Syncra.Application.Features.Media.Commands;

public class UploadMediaCommandHandler : IRequestHandler<UploadMediaCommand, MediaDto>
{
    private readonly IStorageService _storageService;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly MediaOptions _mediaOptions;

    public UploadMediaCommandHandler(
        IStorageService storageService,
        IMediaRepository mediaRepository,
        IUnitOfWork unitOfWork,
        IOptions<MediaOptions> mediaOptions)
    {
        _storageService = storageService;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
        _mediaOptions = mediaOptions.Value;
    }

    public async Task<MediaDto> Handle(UploadMediaCommand request, CancellationToken cancellationToken)
    {
        if (request.SizeBytes > _mediaOptions.MaxFileSize)
            throw new DomainException("validation_error",
                $"File size cannot exceed {_mediaOptions.MaxFileSize / 1024 / 1024}MB.");

        if (!_mediaOptions.AllowedMimeTypes.Contains(request.ContentType))
            throw new DomainException("validation_error",
                $"File type not allowed. Allowed types: {string.Join(", ", _mediaOptions.AllowedMimeTypes)}.");

        var storageResult = await _storageService.SaveAsync(request.FileStream, request.FileName, request.ContentType);

        var media = MediaEntity.Create(
            request.WorkspaceId,
            request.FileName,
            storageResult.PublicUrl,
            request.ContentType,
            request.SizeBytes);

        if (request.PostId.HasValue)
        {
            media.AttachToPost(request.PostId.Value);
        }

        if (request.IdeaId.HasValue)
        {
            media.AttachToIdea(request.IdeaId.Value);
        }

        await _mediaRepository.AddAsync(media);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return ToDto(media);
    }

    private static MediaDto ToDto(MediaEntity m) =>
        new(m.Id, m.WorkspaceId, m.FileName, m.FileUrl, m.MediaType, m.MimeType, m.SizeBytes, m.PostId, m.IdeaId, m.CreatedAtUtc);
}
