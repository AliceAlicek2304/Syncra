using MediatR;

namespace Syncra.Application.Features.Auth.Commands;

public sealed record ResendVerificationEmailCommand(string Email) : IRequest<ResendVerificationEmailResponse>;

public sealed record ResendVerificationEmailResponse(string Message);
