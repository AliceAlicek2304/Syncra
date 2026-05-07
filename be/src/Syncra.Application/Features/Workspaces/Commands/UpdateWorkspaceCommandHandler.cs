using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Workspaces.Commands;

public sealed class UpdateWorkspaceCommandHandler : IRequestHandler<UpdateWorkspaceCommand, WorkspaceDto>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateWorkspaceCommandHandler(
        IWorkspaceRepository workspaceRepository,
        IUnitOfWork unitOfWork)
    {
        _workspaceRepository = workspaceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<WorkspaceDto> Handle(UpdateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId);
        if (workspace == null)
        {
            throw new KeyNotFoundException($"Workspace with ID {request.WorkspaceId} not found.");
        }

        // Check if user has permission (owner only for now)
        if (workspace.OwnerUserId != request.UserId)
        {
            throw new UnauthorizedAccessException("Only the owner can update the workspace settings.");
        }

        workspace.Rename(request.Name);
        workspace.UpdatedAtUtc = DateTime.UtcNow;

        await _workspaceRepository.UpdateAsync(workspace);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(workspace.Id, workspace.Name.Value, workspace.Slug.Value, workspace.OwnerUserId, workspace.CreatedAtUtc);
    }
}
