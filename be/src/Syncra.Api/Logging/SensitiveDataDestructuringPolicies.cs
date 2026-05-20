using Serilog.Configuration;
using Syncra.Application.Features.Auth.Commands;

namespace Syncra.Api.Logging;

/// <summary>
/// Serilog destructuring policies that redact sensitive fields from known
/// command DTOs before they reach the log sinks.
/// </summary>
public static class SensitiveDataDestructuringPolicies
{
    private const string Redacted = "***REDACTED***";

    /// <summary>
    /// Registers all sensitive-data destructuring policies on the given logger configuration.
    /// Call from Program.cs: .Destructure.With(SensitiveDataDestructuringPolicies.Create)
    /// </summary>
    public static LoggerConfiguration Create(LoggerConfiguration configuration)
    {
        return configuration
            .Destructure.ByTransforming<LoginCommand>(cmd => new
            {
                cmd.Email,
                Password = Redacted
            })
            .Destructure.ByTransforming<RegisterCommand>(cmd => new
            {
                cmd.Email,
                Password = Redacted,
                cmd.FirstName,
                cmd.LastName
            })
            .Destructure.ByTransforming<ChangePasswordCommand>(cmd => new
            {
                cmd.UserId,
                CurrentPassword = cmd.CurrentPassword != null ? Redacted : null,
                NewPassword = Redacted
            })
            .Destructure.ByTransforming<ResetPasswordCommand>(cmd => new
            {
                Token = Redacted,
                NewPassword = Redacted
            });
    }
}
