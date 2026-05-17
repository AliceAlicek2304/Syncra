using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Services;

public class PostmarkEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly PostmarkOptions _options;
    private readonly IHostEnvironment? _environment;

    public PostmarkEmailService(
        IHttpClientFactory httpClientFactory,
        IOptions<PostmarkOptions> options,
        IHostEnvironment? environment = null)
    {
        _options = options.Value;
        _environment = environment;
        _httpClient = httpClientFactory.CreateClient("PostmarkEmail");
    }

    public async Task SendPasswordResetEmailAsync(User user, string resetToken, CancellationToken cancellationToken = default)
    {
        if (ShouldSkipEmailDelivery())
        {
            return;
        }

        var resetUrl = $"https://syncra.app/reset-password?token={resetToken}";

        var htmlBody = BuildPasswordResetHtmlBody(resetUrl);
        var textBody = BuildPasswordResetTextBody(resetUrl);

        var payload = new
        {
            From = $"{_options.FromName} <{_options.FromEmail}>",
            To = user.Email.Value,
            Subject = "Reset your Syncra password",
            HtmlBody = htmlBody,
            TextBody = textBody
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.postmarkapp.com/email")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("X-Postmark-Server-Token", _options.ApiKey);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task SendPasswordChangedEmailAsync(User user, CancellationToken cancellationToken = default)
    {
        if (ShouldSkipEmailDelivery())
        {
            return;
        }

        var htmlBody = BuildPasswordChangedHtmlBody();
        var textBody = BuildPasswordChangedTextBody();

        var payload = new
        {
            From = $"{_options.FromName} <{_options.FromEmail}>",
            To = user.Email.Value,
            Subject = "Your Syncra password has been changed",
            HtmlBody = htmlBody,
            TextBody = textBody
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.postmarkapp.com/email")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("X-Postmark-Server-Token", _options.ApiKey);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    public async Task SendEmailVerificationAsync(User user, string verificationToken, CancellationToken cancellationToken = default)
    {
        if (ShouldSkipEmailDelivery())
        {
            return;
        }

        var verificationUrl = $"https://syncra.app/verify-email?token={Uri.EscapeDataString(verificationToken)}";

        var htmlBody = BuildEmailVerificationHtmlBody(verificationUrl, user.Profile?.FirstName ?? "User");
        var textBody = BuildEmailVerificationTextBody(verificationUrl);

        var payload = new
        {
            From = $"{_options.FromName} <{_options.FromEmail}>",
            To = user.Email.Value,
            Subject = "Verify your email address",
            HtmlBody = htmlBody,
            TextBody = textBody
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.postmarkapp.com/email")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.Add("X-Postmark-Server-Token", _options.ApiKey);

        var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
    }

    private bool ShouldSkipEmailDelivery()
    {
        return _environment?.IsDevelopment() == true || string.IsNullOrWhiteSpace(_options.ApiKey);
    }

    private static string BuildPasswordResetHtmlBody(string resetUrl)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080b14; padding: 40px 20px;"">
    <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
        <tr><td align=""center"">
            <table style=""max-width: 480px; width: 100%; background: #0f1220; border-radius: 18px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);"">
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <h1 style=""color: #fff; font-size: 24px; font-weight: 800; margin: 0;"">Syncra</h1>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 8px;"">
                    <h2 style=""color: #e4e6f0; font-size: 18px; font-weight: 700; margin: 0;"">Reset your password</h2>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <p style=""color: #8b8fa3; font-size: 14px; line-height: 1.6; margin: 0;"">
                        Click the button below to reset your password. This link expires in 1 hour.
                    </p>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <a href=""{resetUrl}"" style=""display: inline-block; padding: 14px 32px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-size: 14px; font-weight: 700; text-decoration: none;"">
                        Reset Password
                    </a>
                </td></tr>
                <tr><td align=""center"">
                    <p style=""color: #6b6f82; font-size: 12px; line-height: 1.5; margin: 0;"">
                        If you didn't request this, you can safely ignore this email.<br>
                        For security, this link expires in 1 hour and can only be used once.
                    </p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>";
    }

    private static string BuildPasswordResetTextBody(string resetUrl)
    {
        return $"Reset your Syncra password\n\nClick the link below to reset your password. This link expires in 1 hour.\n\n{resetUrl}\n\nIf you didn't request this, you can safely ignore this email.";
    }

    private static string BuildPasswordChangedHtmlBody()
    {
        return @"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080b14; padding: 40px 20px;"">
    <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
        <tr><td align=""center"">
            <table style=""max-width: 480px; width: 100%; background: #0f1220; border-radius: 18px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);"">
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <h1 style=""color: #fff; font-size: 24px; font-weight: 800; margin: 0;"">Syncra</h1>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 8px;"">
                    <h2 style=""color: #e4e6f0; font-size: 18px; font-weight: 700; margin: 0;"">Password Changed</h2>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <p style=""color: #8b8fa3; font-size: 14px; line-height: 1.6; margin: 0;"">
                        Your password has been changed successfully. Your account is now more secure.
                    </p>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <p style=""color: #8b8fa3; font-size: 14px; line-height: 1.6; margin: 0;"">
                        All active sessions have been logged out for security.
                    </p>
                </td></tr>
                <tr><td align=""center"">
                    <p style=""color: #6b6f82; font-size: 12px; line-height: 1.5; margin: 0;"">
                        If you didn't make this change, please contact support immediately at support@syncra.app
                    </p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>";
    }

    private static string BuildPasswordChangedTextBody()
    {
        return "Password Changed\n\nYour password has been changed successfully. Your account is now more secure.\n\nAll active sessions have been logged out for security.\n\nIf you didn't make this change, please contact support immediately at support@syncra.app";
    }

    private static string BuildEmailVerificationHtmlBody(string verificationUrl, string userName)
    {
        return $@"<!DOCTYPE html>
<html>
<head><meta charset=""utf-8""></head>
<body style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080b14; padding: 40px 20px;"">
    <table width=""100%"" cellpadding=""0"" cellspacing=""0"">
        <tr><td align=""center"">
            <table style=""max-width: 480px; width: 100%; background: #0f1220; border-radius: 18px; padding: 40px; border: 1px solid rgba(255,255,255,0.06);"">
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <h1 style=""color: #fff; font-size: 24px; font-weight: 800; margin: 0;"">Syncra</h1>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 8px;"">
                    <h2 style=""color: #e4e6f0; font-size: 18px; font-weight: 700; margin: 0;"">Verify your email address</h2>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <p style=""color: #8b8fa3; font-size: 14px; line-height: 1.6; margin: 0;"">
                        Hi {userName}, welcome to Syncra! Click the button below to verify your email address.
                    </p>
                </td></tr>
                <tr><td align=""center"" style=""padding-bottom: 24px;"">
                    <a href=""{verificationUrl}"" style=""display: inline-block; padding: 14px 32px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff; font-size: 14px; font-weight: 700; text-decoration: none;"">
                        Verify Email
                    </a>
                </td></tr>
                <tr><td align=""center"">
                    <p style=""color: #6b6f82; font-size: 12px; line-height: 1.5; margin: 0;"">
                        This link expires in 7 days and can only be used once.<br>
                        If you didn't create this account, ignore this email.
                    </p>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>";
    }

    private static string BuildEmailVerificationTextBody(string verificationUrl)
    {
        return $"Verify your email address\n\nClick the link below to verify your email address and complete your registration.\n\n{verificationUrl}\n\nThis link expires in 7 days and can only be used once.\n\nIf you didn't create this account, ignore this email.";
    }
}

