using MediatR;
using Syncra.Application.DTOs.Auth;

namespace Syncra.Application.Features.Auth.Commands;

public record RegisterCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName
) : IRequest<AuthResponseDto>;