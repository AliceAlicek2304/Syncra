using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Application.Features.Users.Commands;

public sealed class UpdateUserProfileCommandHandler : IRequestHandler<UpdateUserProfileCommand, UserProfileDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateUserProfileCommandHandler(IUserRepository userRepository, IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<UserProfileDto> Handle(UpdateUserProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdWithProfileAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException($"User with ID {request.UserId} not found.");
        }

        if (user.Profile == null)
        {
            user.Profile = new UserProfile
            {
                UserId = user.Id,
                CreatedAtUtc = DateTime.UtcNow
            };
        }

        user.Profile.DisplayName = request.DisplayName;
        user.Profile.FirstName = request.FirstName;
        user.Profile.LastName = request.LastName;
        user.Profile.Timezone = request.Timezone;
        user.Profile.Locale = request.Locale;
        user.Profile.UpdatedAtUtc = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new UserProfileDto(
            user.Id,
            user.Email.Value,
            user.Profile.DisplayName,
            user.Profile.FirstName,
            user.Profile.LastName,
            user.Profile.AvatarUrl,
            user.Profile.Timezone,
            user.Profile.Locale);
    }
}
