namespace Syncra.Application.DTOs.Auth;

public record AuthResponseDto(
    string Token,
    string RefreshToken,
    DateTime ExpiresAtUtc
);