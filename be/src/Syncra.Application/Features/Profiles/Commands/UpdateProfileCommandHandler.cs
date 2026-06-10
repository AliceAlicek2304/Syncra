// Webhook investigation: As of 2025-06, Zernio does NOT provide a profile update
// webhook event (no "profile.updated" or similar event type). The registered
// event types (post.*, account.*, message.*, comment.*, review.*, etc.) are
// listed in ZernioWebhookRegistrationService.AllEvents. If Zernio adds profile
// webhook events in the future, implement a handler in ProcessZernioWebhookJob
// similar to account.* pattern: re-fetch profile via GetProfileAsync and update
// the local ZernioProfile aggregate via Update(). Do NOT mix with this fix.

using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Profiles.Commands;

public sealed class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, ProfileDto>
{
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateProfileCommandHandler> _logger;

    public UpdateProfileCommandHandler(
        IZernioProfileRepository zernioProfileRepository,
        IWorkspaceRepository workspaceRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork,
        ILogger<UpdateProfileCommandHandler> logger)
    {
        _zernioProfileRepository = zernioProfileRepository;
        _workspaceRepository = workspaceRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<ProfileDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var profile = await _zernioProfileRepository.GetByIdAsync(request.ProfileId, cancellationToken);
        if (profile == null || profile.WorkspaceId != request.WorkspaceId)
        {
            throw new KeyNotFoundException($"Profile with ID {request.ProfileId} not found in workspace {request.WorkspaceId}.");
        }

        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId);
        if (workspace == null)
        {
            throw new KeyNotFoundException($"Workspace with ID {request.WorkspaceId} not found.");
        }

        if (workspace.OwnerUserId != request.UserId)
        {
            throw new UnauthorizedAccessException("Only the owner can update the profile settings.");
        }

        await _zernioClient.UpdateProfileAsync(
            profile.ZernioProfileId,
            request.Name,
            cancellationToken);

        profile.Update(request.Name, profile.AvatarUrl);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Updated ZernioProfile {ProfileId} name to {Name}.",
            request.ProfileId,
            request.Name);

        return new ProfileDto(
            profile.Id,
            request.Name,
            profile.ZernioProfileId,
            workspace.Color,
            profile.AvatarUrl,
            profile.IsActive,
            profile.CreatedAtUtc);
    }
}
