using MediatR;

namespace Syncra.Application.Features.Auth.Commands;

public sealed record ForgotPasswordCommand(string Email) : IRequest<ForgotPasswordResponse>;

public sealed record ForgotPasswordResponse(string Message);
