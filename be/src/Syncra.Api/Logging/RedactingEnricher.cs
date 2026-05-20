using Serilog.Core;
using Serilog.Events;

namespace Syncra.Api.Logging;

public class RedactingEnricher : ILogEventEnricher
{
    private static readonly string[] SensitiveKeywords = { "access_token", "client_secret", "Stripe-Signature", "password", "secret", "refresh_token", "new_password", "authorization", "api_key", "current_password", "refreshToken", "newPassword", "currentPassword", "apiKey", "accessToken" };

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        foreach (var property in logEvent.Properties.ToList())
        {
            if (SensitiveKeywords.Contains(property.Key, StringComparer.OrdinalIgnoreCase))
            {
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(property.Key, "***REDACTED***"));
            }
        }
    }
}