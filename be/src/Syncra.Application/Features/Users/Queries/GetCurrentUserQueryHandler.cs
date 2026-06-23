using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Users.Queries;

public sealed class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    private readonly IUserRepository _userRepository;

    public GetCurrentUserQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdWithProfileAndWorkspacesAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        var profile = user.Profile is not null
            ? new UserProfileDto(
                user.Id,
                user.Email.Value,
                user.Profile.DisplayName,
                user.Profile.FirstName,
                user.Profile.LastName,
                user.Profile.AvatarUrl,
                user.Profile.Timezone,
                user.Profile.Locale,
                user.HasPasswordBeenSet)
            : null;

        var membership = user.WorkspaceMemberships
            .FirstOrDefault(m => m.Workspace is not null);

        CurrentUserWorkspaceDto? workspace = null;
        if (membership?.Workspace is not null)
        {
            var profiles = membership.Workspace.ZernioProfiles
                .Select(p => new ZernioProfileBriefDto(
                    p.Id,
                    p.ZernioProfileId,
                    p.DisplayName,
                    p.Platform,
                    p.AvatarUrl,
                    p.IsActive))
                .ToList();

            workspace = new CurrentUserWorkspaceDto(
                membership.Workspace.Id,
                membership.Workspace.Name.Value,
                membership.Workspace.Slug.Value,
                membership.Workspace.Color,
                membership.Workspace.Description,
                membership.Role.ToString(),
                membership.Status.ToString(),
                profiles);
        }

        return new UserDto(
            user.Id,
            user.Email.Value,
            user.HasPasswordBeenSet,
            profile,
            workspace,
            user.StudentEmail,
            user.StudentEmailVerifiedAtUtc,
            user.StudentVerificationExpiresAtUtc,
            user.HasValidStudentVerification);
    }
}
