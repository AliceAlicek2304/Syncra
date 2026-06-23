using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Syncra.Application.DTOs.Students;
using Syncra.Application.Features.Students;
using Syncra.Application.Interfaces;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.ValueObjects;

namespace Syncra.Application.Features.Students.Commands;

public sealed class RequestStudentVerificationCommandHandler
    : IRequestHandler<RequestStudentVerificationCommand, RequestStudentVerificationResponse>
{
    private static readonly TimeSpan CodeTtl = TimeSpan.FromMinutes(15);

    private readonly IUserRepository _userRepository;
    private readonly IEmailService _emailService;
    private readonly IDistributedCache _cache;

    public RequestStudentVerificationCommandHandler(
        IUserRepository userRepository,
        IEmailService emailService,
        IDistributedCache cache)
    {
        _userRepository = userRepository;
        _emailService = emailService;
        _cache = cache;
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

        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
        var cacheKey = BuildCacheKey(user.Id, studentEmail);
        var codeHash = HashCode(code);
        var expiresAtUtc = DateTime.UtcNow.Add(CodeTtl);

        await _cache.SetStringAsync(
            cacheKey,
            codeHash,
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = CodeTtl },
            cancellationToken);

        await _emailService.SendStudentVerificationCodeAsync(studentEmail, code, cancellationToken);

        return new RequestStudentVerificationResponse(
            "Verification code sent to your student email.",
            expiresAtUtc);
    }

    internal static string BuildCacheKey(Guid userId, string studentEmail) =>
        $"student_verify:{userId:N}:{studentEmail.Trim().ToUpperInvariant()}";

    internal static string HashCode(string code)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(code));
        return Convert.ToBase64String(hashBytes);
    }
}
