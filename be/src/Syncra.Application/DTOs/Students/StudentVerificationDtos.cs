namespace Syncra.Application.DTOs.Students;

public sealed record StudentVerificationStatusDto(
    string? StudentEmail,
    DateTime? VerifiedAtUtc,
    DateTime? ExpiresAtUtc,
    bool IsVerified,
    bool IsExpired);

public sealed record RequestStudentVerificationResponse(
    string Message,
    DateTime ExpiresAtUtc);

public sealed record VerifyStudentEmailResponse(
    string StudentEmail,
    DateTime VerifiedAtUtc,
    DateTime ExpiresAtUtc,
    bool IsVerified);
