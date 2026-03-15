using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Media.Commands;

public class DeleteMediaCommandHandler : IRequestHandler<DeleteMediaCommand>
{
    private readonly IMediaRepository _mediaRepository;
    private readonly IStorageService _storageService;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMediaCommandHandler(
        IMediaRepository mediaRepository,
        IStorageService storageService,
        IUnitOfWork unitOfWork)
    {
        _mediaRepository = mediaRepository;
        _storageService = storageService;
        _unitOfWork = unitOfWork;
    }

    public async Task Handle(DeleteMediaCommand request, CancellationToken cancellationToken)
    {
        var media = await _mediaRepository.GetByIdAsync(request.MediaId);

        if (media == null || media.WorkspaceId != request.WorkspaceId)
            throw new DomainException("not_found", "Media not found.");

        if (media.PostId.HasValue)
            throw new DomainException("invalid_operation", "Cannot delete media that is attached to a post.");

        var storageKey = Path.GetFileName(media.FileUrl);
        await _storageService.DeleteAsync(storageKey);

        await _mediaRepository.DeleteAsync(media.Id);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
