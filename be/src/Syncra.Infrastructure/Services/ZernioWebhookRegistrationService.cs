using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;

namespace Syncra.Infrastructure.Services;

public sealed class ZernioWebhookRegistrationService : BackgroundService
{
    private static readonly List<string> AllEvents =
    [
        "post.scheduled", "post.published", "post.failed", "post.partial",
        "post.cancelled", "post.recycled",
        "post.platform.published", "post.platform.failed",
        "account.connected", "account.disconnected", "account.ads.initial_sync_completed",
        "message.received", "message.sent", "message.edited", "message.deleted",
        "message.delivered", "message.read", "message.failed",
        "reaction.received",
        "comment.received",
        "review.new", "review.updated",
        "ad.status_changed",
        "whatsapp.template.status_updated"
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptions<ZernioOptions> _options;
    private readonly ILogger<ZernioWebhookRegistrationService> _logger;

    public ZernioWebhookRegistrationService(
        IServiceScopeFactory scopeFactory,
        IOptions<ZernioOptions> options,
        ILogger<ZernioWebhookRegistrationService> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var webhookUrl = _options.Value.WebhookUrl;
        var webhookSecret = _options.Value.WebhookSecret;

        if (string.IsNullOrWhiteSpace(webhookUrl) || string.IsNullOrWhiteSpace(webhookSecret))
        {
            _logger.LogInformation(
                "Zernio webhook registration skipped: WebhookUrl or WebhookSecret not configured. " +
                "Set Zernio:WebhookUrl and Zernio:WebhookSecret to enable auto-registration.");
            return;
        }

        // Delay a few seconds so the app can finish initializing
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var zernioClient = scope.ServiceProvider.GetRequiredService<IZernioClient>();

        try
        {
            _logger.LogInformation("Checking existing Zernio webhook registrations...");

            var existingWebhooks = await zernioClient.ListWebhooksAsync(stoppingToken);
            var match = existingWebhooks.Webhooks.FirstOrDefault(w =>
                string.Equals(w.Url, webhookUrl, StringComparison.OrdinalIgnoreCase));

            if (match != null)
            {
                // Webhook exists — check if anything changed
                var eventsChanged = !AreEventsEqual(match.Events, AllEvents);
                var secretChanged = match.Secret != webhookSecret;
                var urlChanged = match.Url != webhookUrl;

                if (eventsChanged || secretChanged || urlChanged || !match.IsActive)
                {
                    _logger.LogInformation(
                        "Updating existing Zernio webhook {WebhookId}. EventsChanged={EventsChanged}, SecretChanged={SecretChanged}, UrlChanged={UrlChanged}, WasInactive={WasInactive}",
                        match.Id, eventsChanged, secretChanged, urlChanged, !match.IsActive);

                    var updateResult = await zernioClient.UpdateWebhookAsync(
                        new ZernioWebhookUpdateRequestDto(
                            Id: match.Id,
                            Url: webhookUrl,
                            Secret: webhookSecret,
                            Events: AllEvents,
                            IsActive: true),
                        stoppingToken);

                    if (updateResult.Success)
                        _logger.LogInformation("Zernio webhook {WebhookId} updated successfully.", match.Id);
                    else
                        _logger.LogError("Failed to update Zernio webhook {WebhookId}.", match.Id);
                }
                else
                {
                    _logger.LogInformation(
                        "Zernio webhook {WebhookId} is already up-to-date.", match.Id);
                }
            }
            else
            {
                // No matching webhook — create one
                _logger.LogInformation(
                    "No matching webhook found for URL {Url}. Creating new webhook registration...", webhookUrl);

                var createResult = await zernioClient.CreateWebhookAsync(
                    new ZernioWebhookCreateRequestDto(
                        Name: "Syncra",
                        Url: webhookUrl,
                        Secret: webhookSecret,
                        Events: AllEvents,
                        IsActive: true),
                    stoppingToken);

                if (createResult.Success)
                    _logger.LogInformation(
                        "Zernio webhook created successfully. Id={WebhookId}, Url={Url}",
                        createResult.Webhook?.Id, webhookUrl);
                else
                    _logger.LogError("Failed to create Zernio webhook for URL {Url}.", webhookUrl);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error during Zernio webhook auto-registration. App will continue without webhook sync. " +
                "Check Zernio:WebhookUrl and Zernio:WebhookSecret configuration.");
        }
    }

    private static bool AreEventsEqual(List<string> a, List<string> b)
    {
        if (a.Count != b.Count) return false;
        var set = new HashSet<string>(a, StringComparer.OrdinalIgnoreCase);
        return b.All(e => set.Contains(e));
    }
}
