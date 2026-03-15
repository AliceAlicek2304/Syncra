using System.Text.RegularExpressions;
using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Application.Features.Workspaces.Commands;

public sealed class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, WorkspaceDto>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateWorkspaceCommandHandler(
        IWorkspaceRepository workspaceRepository,
        IUnitOfWork unitOfWork)
    {
        _workspaceRepository = workspaceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<WorkspaceDto> Handle(CreateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var slug = GenerateSlug(request.Name);

        // Ensure slug uniqueness
        var existing = await _workspaceRepository.GetBySlugAsync(slug);
        if (existing != null)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";
        }

        // Use domain entity factory
        var workspace = Workspace.Create(request.UserId, request.Name, slug);

        // Use domain behavior to add owner as member
        workspace.AddMember(request.UserId, "owner");

        await _workspaceRepository.AddAsync(workspace);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(workspace.Id, workspace.Name.Value, workspace.Slug.Value, workspace.OwnerUserId, workspace.CreatedAtUtc);
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"[^a-z0-9\-]", "");
        slug = Regex.Replace(slug, @"-{2,}", "-").Trim('-');
        return slug.Length > 0 ? slug : "workspace";
    }
}