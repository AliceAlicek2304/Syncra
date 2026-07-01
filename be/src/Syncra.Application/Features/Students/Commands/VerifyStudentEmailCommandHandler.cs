using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.DTOs.Students;
using Syncra.Application.Features.Students;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.ValueObjects;

namespace Syncra.Application.Features.Students.Commands;

public sealed class VerifyStudentEmailCommandHandler
    : IRequestHandler<VerifyStudentEmailCommand, VerifyStudentEmailResponse>
{
    private readonly IUserRepository _userRepository;
    private readonly IDistributedCache _cache;
    private readonly IUnitOfWork _unitOfWork;

    public VerifyStudentEmailCommandHandler(
        IUserRepository userRepository,
        IDistributedCache cache,
        IUnitOfWork unitOfWork)
    {
        _userRepository = userRepository;
        _cache = cache;
        _unitOfWork = unitOfWork;
    }

    public async Task<VerifyStudentEmailResponse> Handle(
        VerifyStudentEmailCommand request,
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

        var studentEmailOwner = await _userRepository.GetByStudentEmailAsync(studentEmail, cancellationToken);
        if (studentEmailOwner != null && studentEmailOwner.Id != user.Id)
        {
            throw new DomainException(
                "student_email_already_used",
                "This student email is already linked to another account.");
        }

        var cacheKey = RequestStudentVerificationCommandHandler.BuildCacheKey(user.Id, studentEmail);
        var verifiedAtUtc = DateTime.UtcNow;
        user.VerifyStudentEmail(studentEmail, verifiedAtUtc);
        await _userRepository.UpdateAsync(user);
        await _cache.RemoveAsync(cacheKey, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new VerifyStudentEmailResponse(
            user.StudentEmail!,
            user.StudentEmailVerifiedAtUtc!.Value,
            user.StudentVerificationExpiresAtUtc!.Value,
            user.HasValidStudentVerification);
    }
}
