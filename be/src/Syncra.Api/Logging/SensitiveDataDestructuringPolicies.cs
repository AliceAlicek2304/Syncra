using Serilog.Core;
using Serilog.Events;
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
    /// All destructuring policies for sensitive auth command DTOs.
    /// Register each with: .Destructure.With(policy)
    /// </summary>
    public static IEnumerable<IDestructuringPolicy> Policies { get; } = new IDestructuringPolicy[]
    {
        new DestructuringPolicy<LoginCommand>(cmd => new Dictionary<string, object?>
        {
            [nameof(LoginCommand.Email)] = cmd.Email,
            [nameof(LoginCommand.Password)] = Redacted
        }),
        new DestructuringPolicy<RegisterCommand>(cmd => new Dictionary<string, object?>
        {
            [nameof(RegisterCommand.Email)] = cmd.Email,
            [nameof(RegisterCommand.Password)] = Redacted,
            [nameof(RegisterCommand.FirstName)] = cmd.FirstName,
            [nameof(RegisterCommand.LastName)] = cmd.LastName
        }),
        new DestructuringPolicy<ChangePasswordCommand>(cmd => new Dictionary<string, object?>
        {
            [nameof(ChangePasswordCommand.UserId)] = cmd.UserId,
            [nameof(ChangePasswordCommand.CurrentPassword)] = cmd.CurrentPassword != null ? Redacted : null,
            [nameof(ChangePasswordCommand.NewPassword)] = Redacted
        }),
        new DestructuringPolicy<ResetPasswordCommand>(cmd => new Dictionary<string, object?>
        {
            ["Token"] = Redacted,
            ["NewPassword"] = Redacted
        })
    };

    /// <summary>
    /// Generic destructuring policy that transforms a specific type into a
    /// dictionary of redacted properties.
    /// </summary>
    private class DestructuringPolicy<T> : IDestructuringPolicy
    {
        private readonly Func<T, Dictionary<string, object?>> _transform;

        public DestructuringPolicy(Func<T, Dictionary<string, object?>> transform)
        {
            _transform = transform;
        }

        public bool TryDestructure(object value, ILogEventPropertyValueFactory propertyFactory, out LogEventPropertyValue result)
        {
            if (value is T typed)
            {
                var dict = _transform(typed);
                result = propertyFactory.CreatePropertyValue(dict, true);
                return true;
            }

            result = null!;
            return false;
        }
    }
}
