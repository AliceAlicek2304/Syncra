namespace Syncra.Application.DTOs.Auth;

public record LinkedAccountDto(
    string Provider, 
    string? ProviderKey, 
    DateTime LinkedAtUtc);
