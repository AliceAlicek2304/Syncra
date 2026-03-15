using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

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
        var user = await _userRepository.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("User not found.");
        }

        return new UserDto(user.Id, user.Email.Value);
    }
}