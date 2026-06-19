using System.Text.RegularExpressions;
using MediatR;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;

namespace Syncra.Application.Features.Workspaces.Commands;

public sealed class CreateWorkspaceCommandHandler : IRequestHandler<CreateWorkspaceCommand, WorkspaceDto>
{
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IUnitOfWork _unitOfWork;

    public CreateWorkspaceCommandHandler(
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IZernioProfileRepository zernioProfileRepository,
        IZernioClient zernioClient,
        IUnitOfWork unitOfWork)
    {
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _zernioProfileRepository = zernioProfileRepository;
        _zernioClient = zernioClient;
        _unitOfWork = unitOfWork;
    }

    public async Task<WorkspaceDto> Handle(CreateWorkspaceCommand request, CancellationToken cancellationToken)
    {
        var slug = GenerateSlug(request.Name);

        var existing = await _workspaceRepository.GetBySlugAsync(slug);
        if (existing != null)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";
        }

        var workspace = Workspace.Create(request.UserId, request.Name, slug, request.Color, request.Description);
        workspace.AddMember(request.UserId, "owner");

        await _workspaceRepository.AddAsync(workspace);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var provisioned = await _zernioClient.ProvisionProfileAsync(
            workspaceId: workspace.Id.ToString(),
            name: request.Name,
            cancellationToken: cancellationToken);

        var profile = ZernioProfile.Create(
            workspaceId: workspace.Id,
            zernioProfileId: provisioned.Id,
            displayName: provisioned.Name,
            platform: "zernio");

        await _zernioProfileRepository.AddAsync(profile);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new WorkspaceDto(
            workspace.Id,
            workspace.Name.Value,
            workspace.Slug.Value,
            workspace.OwnerUserId,
            workspace.CreatedAtUtc,
            ZernioProfileId: provisioned.Id,
            Color: workspace.Color,
            Description: workspace.Description);
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
