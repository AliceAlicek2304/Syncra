using MediatR;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Workspaces.Commands;

public sealed class DeleteWorkspaceCommandHandler : IRequestHandler<DeleteWorkspaceCommand>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteWorkspaceCommandHandler(
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

    public async Task Handle(DeleteWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId);
        if (workspace == null)
        {
            throw new KeyNotFoundException($"Workspace with ID {request.WorkspaceId} not found.");
        }

        if (workspace.OwnerUserId != request.UserId)
        {
            throw new UnauthorizedAccessException("Only the owner can delete the workspace.");
        }

        var zernioProfile = await _zernioProfileRepository.GetByWorkspaceIdAsync(request.WorkspaceId);

        if (zernioProfile is not null)
        {
            await _zernioClient.DeleteProfileAsync(
                zernioProfile.ZernioProfileId,
                cancellationToken);
        }

        await _workspaceRepository.DeleteAsync(request.WorkspaceId);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
