using MediatR;
using Syncra.Application.DTOs.Auth;

namespace Syncra.Application.Features.Auth.Commands;

public record OAuthLoginCommand(
    string ProviderName,
    string Code,
    string State,
    string ReturnUrl
) : IRequest<AuthResponseDto>;
