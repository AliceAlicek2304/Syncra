namespace Syncra.Application.DTOs.Auth;

public record LinkAccountDto(
    string Email, 
    string Password, 
    string Provider, 
    string ProviderKey);
