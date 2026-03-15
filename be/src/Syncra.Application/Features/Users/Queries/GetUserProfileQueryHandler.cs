using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Users.Queries;

public sealed class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, UserProfileDto>
{
    private readonly IUserRepository _userRepository;

    public GetUserProfileQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserProfileDto> Handle(GetUserProfileQuery request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdWithProfileAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return new UserProfileDto(
            user.Id,
            user.Email.Value,
            user.Profile?.DisplayName,
            user.Profile?.FirstName,
            user.Profile?.LastName,
            user.Profile?.AvatarUrl,
            user.Profile?.Timezone,
            user.Profile?.Locale
        );
    }
}