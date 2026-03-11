namespace Syncra.Application.DTOs;

public record AuthResponseDto(string Token, string RefreshToken, DateTime ExpiresAt);
