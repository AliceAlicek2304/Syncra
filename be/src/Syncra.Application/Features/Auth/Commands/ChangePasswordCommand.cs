using MediatR;

namespace Syncra.Application.Features.Auth.Commands;

public sealed record ChangePasswordCommand(
    Guid UserId,
    string? CurrentPassword,
    string NewPassword
) : IRequest<Unit>;
