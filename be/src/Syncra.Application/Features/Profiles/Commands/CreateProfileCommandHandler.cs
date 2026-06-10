using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Profiles.Commands;

public sealed class CreateProfileCommandHandler : IRequestHandler<CreateProfileCommand, ProfileDto>
{
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateProfileCommandHandler> _logger;

    public CreateProfileCommandHandler(
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        IUnitOfWork unitOfWork,
        ILogger<CreateProfileCommandHandler> logger)
    {
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ProfileDto> Handle(CreateProfileCommand request, CancellationToken cancellationToken)
    {
        var provisioned = await _zernioClient.ProvisionProfileAsync(
            workspaceId: request.WorkspaceId.ToString(),
            name: request.Name,
            cancellationToken: cancellationToken);

        var profile = ZernioProfile.Create(
            workspaceId: request.WorkspaceId,
            zernioProfileId: provisioned.Id,
            displayName: provisioned.Name,
            platform: "zernio");

        await _zernioProfileRepository.AddAsync(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Created ZernioProfile {ProfileId} ({Name}) for workspace {WorkspaceId}.",
            profile.Id,
            profile.DisplayName,
            request.WorkspaceId);

        return new ProfileDto(
            profile.Id,
            profile.DisplayName,
            profile.ZernioProfileId,
            null,
            profile.AvatarUrl,
            profile.IsActive,
            profile.CreatedAtUtc);
    }
}
