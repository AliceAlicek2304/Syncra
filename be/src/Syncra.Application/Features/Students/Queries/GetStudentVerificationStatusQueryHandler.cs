using MediatR;
using Syncra.Application.DTOs.Students;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Students.Queries;

public sealed class GetStudentVerificationStatusQueryHandler
    : IRequestHandler<GetStudentVerificationStatusQuery, StudentVerificationStatusDto>
{
    private readonly IUserRepository _userRepository;

    public GetStudentVerificationStatusQueryHandler(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<StudentVerificationStatusDto> Handle(
        GetStudentVerificationStatusQuery request,
        CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId)
            ?? throw new KeyNotFoundException("User not found.");

        var isExpired = user.StudentVerificationExpiresAtUtc.HasValue &&
            user.StudentVerificationExpiresAtUtc.Value <= DateTime.UtcNow;

        return new StudentVerificationStatusDto(
            user.StudentEmail,
            user.StudentEmailVerifiedAtUtc,
            user.StudentVerificationExpiresAtUtc,
            user.HasValidStudentVerification,
            isExpired);
    }
}
