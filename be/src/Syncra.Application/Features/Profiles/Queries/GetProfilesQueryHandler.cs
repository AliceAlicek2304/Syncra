using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Profiles.Queries;

public sealed class GetProfilesQueryHandler : IRequestHandler<GetProfilesQuery, IReadOnlyList<ProfileDto>>
{
    private readonly IZernioProfileRepository _zernioProfileRepository;

    public GetProfilesQueryHandler(IZernioProfileRepository zernioProfileRepository)
    {
        _zernioProfileRepository = zernioProfileRepository;
    }

    public async Task<IReadOnlyList<ProfileDto>> Handle(GetProfilesQuery request, CancellationToken cancellationToken)
    {
        var profiles = await _zernioProfileRepository.GetActiveByWorkspaceIdAsync(request.WorkspaceId);

        return profiles
            .Select(p => new ProfileDto(
                p.Id,
                p.DisplayName,
                p.ZernioProfileId,
                null,
                p.AvatarUrl,
                p.IsActive,
                p.CreatedAtUtc))
            .ToList();
    }
}
