using MediatR;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Workspaces.Commands;

public sealed class UpdateWorkspaceCommandHandler : IRequestHandler<UpdateWorkspaceCommand, WorkspaceDto>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateWorkspaceCommandHandler(
        IWorkspaceRepository workspaceRepository,
        IZernioProfileRepository zernioProfileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _workspaceRepository = workspaceRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<WorkspaceDto> Handle(UpdateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId);
        if (workspace == null)
        {
            throw new KeyNotFoundException($"Workspace with ID {request.WorkspaceId} not found.");
        }

        if (workspace.OwnerUserId != request.UserId)
        {
            throw new UnauthorizedAccessException("Only the owner can update the workspace settings.");
        }

        workspace.Rename(request.Name);
        workspace.UpdateAppearance(request.Color, request.Description);

        var profiles = await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(request.WorkspaceId);

        if (profiles.Count > 0)
        {
            await Task.WhenAll(profiles.Select(p =>
                _zernioClient.UpdateProfileAsync(
                    p.ZernioProfileId,
                    request.Name,
                    cancellationToken)));

            foreach (var p in profiles)
                p.Update(request.Name, p.AvatarUrl);
        }

        await _workspaceRepository.UpdateAsync(workspace);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name.Value,
            workspace.Slug.Value,
            workspace.OwnerUserId,
            workspace.CreatedAtUtc,
            ZernioProfileId: profiles.FirstOrDefault()?.ZernioProfileId,
            Color: workspace.Color,
            Description: workspace.Description,
            ZernioProfileIds: profiles.Select(p => p.ZernioProfileId).ToList().AsReadOnly());
    }
}
