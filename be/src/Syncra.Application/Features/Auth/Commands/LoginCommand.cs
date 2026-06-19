using MediatR;
using Syncra.Application.DTOs.Auth;

namespace Syncra.Application.Features.Auth.Commands;

public record LoginCommand(
    string Email,
    string Password,
    string? Flow = null,
    string? Plan = null
) : IRequest<AuthResponseDto>;