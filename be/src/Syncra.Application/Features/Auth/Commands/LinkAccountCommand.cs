using MediatR;
using Syncra.Application.DTOs.Auth;

namespace Syncra.Application.Features.Auth.Commands;

public record LinkAccountCommand(
    string Email, 
    string Password, 
    string Provider = "Google", 
    string? ProviderKey = null) : IRequest<AuthResponseDto>;
