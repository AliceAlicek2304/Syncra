using MediatR;

namespace Syncra.Application.Features.Auth.Commands;

public sealed record ResetPasswordCommand(string Token, string NewPassword) : IRequest<Unit>;
