namespace Syncra.Application.Interfaces;

using Syncra.Domain.Entities;

public interface IEmailService
{
    Task SendPasswordResetEmailAsync(User user, string resetToken, CancellationToken cancellationToken = default);
    Task SendPasswordChangedEmailAsync(User user, CancellationToken cancellationToken = default);
    /// <summary>
    /// Send an email verification link to the user.
    /// The email includes a link like: https://myapp.com/verify-email?token={token}
    /// Per D-02 decision: Clicking the link logs the user in and redirects to dashboard.
    /// Per D-04 decision: Token expires in 7 days.
    /// Per D-03 decision: OAuth users skip this (auto-verified by Google).
    /// </summary>
    Task SendEmailVerificationAsync(User user, string verificationToken, CancellationToken cancellationToken = default);
}

