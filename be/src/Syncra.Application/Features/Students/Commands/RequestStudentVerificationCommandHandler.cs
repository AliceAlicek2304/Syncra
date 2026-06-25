using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.DTOs.Students;
using Syncra.Application.Features.Students;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.ValueObjects;

namespace Syncra.Application.Features.Students.Commands;

public sealed class RequestStudentVerificationCommandHandler
    : IRequestHandler<RequestStudentVerificationCommand, RequestStudentVerificationResponse>
{
    private readonly IUserRepository _userRepository;
    private readonly IDistributedCache _cache;
    private readonly IUnitOfWork _unitOfWork;

    public RequestStudentVerificationCommandHandler(
        IUserRepository userRepository,
        IDistributedCache cache,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _cache = cache;
        _unitOfWork = unitOfWork;
    }

    public async Task<RequestStudentVerificationResponse> Handle(
        RequestStudentVerificationCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _userRepository.GetByIdAsync(request.UserId)
            ?? throw new KeyNotFoundException("User not found.");

        var studentEmail = Email.Create(request.StudentEmail).Value;
        if (!StudentEmailPolicy.IsEligibleStudentEmail(studentEmail))
        {
            throw new DomainException(
                "invalid_student_email",
                "Please use a valid student email ending with .edu or .edu.vn.");
        }

        var cacheKey = BuildCacheKey(user.Id, studentEmail);
        await _cache.RemoveAsync(cacheKey, cancellationToken);

        var verifiedAtUtc = DateTime.UtcNow;
        user.VerifyStudentEmail(studentEmail, verifiedAtUtc);
        await _userRepository.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new RequestStudentVerificationResponse(
            "Student email verified.",
            user.StudentVerificationExpiresAtUtc!.Value,
            user.StudentEmail!,
            user.StudentEmailVerifiedAtUtc!.Value,
            user.HasValidStudentVerification);
    }

    internal static string BuildCacheKey(Guid userId, string studentEmail) =>
        $"student_verify:{userId:N}:{studentEmail.Trim().ToUpperInvariant()}";
}
