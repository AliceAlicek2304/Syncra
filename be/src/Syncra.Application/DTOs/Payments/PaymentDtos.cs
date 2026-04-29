namespace Syncra.Application.DTOs.Payments;

public sealed record PaymentCheckoutSessionRequest(
    Guid WorkspaceId,
    string WorkspaceName,
    string? ProviderCustomerId,
    string PriceId,
    string SuccessUrl,
    string CancelUrl);

public sealed record PaymentCheckoutSessionResult(
    string SessionId,
    string CheckoutUrl,
    string? ProviderCustomerId,
    string? ClientReferenceId);

public sealed record PaymentPortalSessionRequest(
    Guid WorkspaceId,
    string WorkspaceName,
    string? ProviderCustomerId,
    string ReturnUrl);

public sealed record PaymentPortalSessionResult(string PortalUrl);

public sealed record PaymentWebhookRequest(
    string Provider,
    string Payload,
    IReadOnlyDictionary<string, string> Headers,
    string Endpoint);

public sealed class PaymentWebhookEvent
{
    public string Provider { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public Guid? WorkspaceId { get; set; }
    public string? ProviderCustomerId { get; set; }
    public string? ProviderSubscriptionId { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed record PaymentWebhookParseResult(
    bool IsValid,
    string? Error,
    PaymentWebhookEvent? WebhookEvent);
