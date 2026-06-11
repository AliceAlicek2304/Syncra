using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Profiles.Commands;

public sealed class DeleteProfileCommandHandler : IRequestHandler<DeleteProfileCommand>
{
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteProfileCommandHandler> _logger;

    public DeleteProfileCommandHandler(
        IZernioProfileRepository zernioProfileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork,
        ILogger<DeleteProfileCommandHandler> logger)
    {
        _zernioProfileRepository = zernioProfileRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task Handle(DeleteProfileCommand request, CancellationToken cancellationToken)
    {
        var profiles = await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(request.WorkspaceId);

        if (profiles.Count <= 1)
        {
            throw new InvalidOperationException("Cannot delete the last profile. Each workspace must have at least one profile.");
        }

        var profile = profiles.FirstOrDefault(p => p.Id == request.ProfileId)
            ?? throw new KeyNotFoundException($"Profile with ID {request.ProfileId} not found in workspace {request.WorkspaceId}.");

        await _zernioClient.DeleteProfileAsync(profile.ZernioProfileId, cancellationToken);

        profile.Deactivate();

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Deleted ZernioProfile {ProfileId} ({Name}) from workspace {WorkspaceId}.",
            request.ProfileId,
            profile.DisplayName,
            request.WorkspaceId);
    }
}
