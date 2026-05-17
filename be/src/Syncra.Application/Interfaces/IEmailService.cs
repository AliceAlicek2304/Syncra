using Syncra.Domain.Entities;

namespace Syncra.Application.Interfaces;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(User user, string resetToken, CancellationToken cancellationToken = default);
    Task SendPasswordChangedEmailAsync(User user, CancellationToken cancellationToken = default);
}
