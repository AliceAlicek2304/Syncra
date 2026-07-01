namespace Syncra.Application.DTOs.Students;

public sealed record StudentVerificationStatusDto(
    string? StudentEmail,
    DateTime? VerifiedAtUtc,
    DateTime? ExpiresAtUtc,
    bool IsVerified,
    bool IsExpired);

public sealed record RequestStudentVerificationResponse(
    string Message,
    DateTime ExpiresAtUtc,
    string? StudentEmail = null,
    DateTime? VerifiedAtUtc = null,
    bool IsVerified = false);

public sealed record VerifyStudentEmailResponse(
    string StudentEmail,
    DateTime VerifiedAtUtc,
    DateTime ExpiresAtUtc,
    bool IsVerified);
