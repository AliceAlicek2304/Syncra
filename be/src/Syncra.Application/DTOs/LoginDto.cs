namespace Syncra.Application.DTOs;

public record LoginDto(string Email, string Password, string? Flow = null, string? Plan = null);
