using System.Reflection;
using System.Text.RegularExpressions;
using Serilog.Core;
using Serilog.Events;
using Serilog.Parsing;

namespace Syncra.Api.Logging;

public class RedactingEnricher : ILogEventEnricher
{
    private static readonly string[] SensitiveKeywords = { "access_token", "client_secret", "Stripe-Signature", "password", "secret", "refresh_token", "new_password", "authorization", "api_key", "current_password", "refreshToken", "newPassword", "currentPassword", "apiKey", "accessToken", "ZernioApiKey", "ApiKey" };

    private static readonly Regex ZernioApiKeyRegex = new Regex(@"sk_[0-9a-f]{64}", RegexOptions.Compiled);
    private static readonly MessageTemplateParser TemplateParser = new MessageTemplateParser();

    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        foreach (var property in logEvent.Properties.ToList())
        {
            var key = property.Key;
            var value = property.Value;

            if (SensitiveKeywords.Contains(key, StringComparer.OrdinalIgnoreCase))
            {
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(key, "***REDACTED***"));
                continue;
            }

            if (value is ScalarValue { Value: string strValue } && ZernioApiKeyRegex.IsMatch(strValue))
            {
                var redacted = ZernioApiKeyRegex.Replace(strValue, "***REDACTED***");
                logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty(key, redacted));
            }
        }

        var templateText = logEvent.MessageTemplate.Text;
        if (ZernioApiKeyRegex.IsMatch(templateText))
        {
            var redactedText = ZernioApiKeyRegex.Replace(templateText, "***REDACTED***");
            var field = typeof(LogEvent).GetField("_messageTemplate", BindingFlags.Instance | BindingFlags.NonPublic)
                ?? typeof(LogEvent).GetField("<MessageTemplate>k__BackingField", BindingFlags.Instance | BindingFlags.NonPublic);
            if (field != null)
            {
                field.SetValue(logEvent, TemplateParser.Parse(redactedText));
            }
        }
    }
}