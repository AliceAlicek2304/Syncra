using MediatR;
using Syncra.Application.DTOs.Auth;

namespace Syncra.Application.Features.Auth.Commands;

public sealed record VerifyEmailCommand(string Token) : IRequest<AuthResponseDto>;
