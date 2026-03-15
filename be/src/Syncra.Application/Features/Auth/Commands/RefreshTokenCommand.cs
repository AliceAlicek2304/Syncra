using MediatR;
using Syncra.Application.DTOs.Auth;

namespace Syncra.Application.Features.Auth.Commands;

public record RefreshTokenCommand(
    string RefreshToken
) : IRequest<AuthResponseDto>;