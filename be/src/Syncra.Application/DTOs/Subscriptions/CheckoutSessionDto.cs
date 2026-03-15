namespace Syncra.Application.DTOs.Subscriptions;

public record CreateCheckoutSessionRequest(
    string PriceId,
    string? SuccessUrl,
    string? CancelUrl);

public record CreateCheckoutSessionResponse(
    string CheckoutUrl,
    string SessionId,
    string? CustomerId,
    string? ClientReferenceId);

public record CreatePortalSessionRequest(string? ReturnUrl);

public record CreatePortalSessionResponse(string PortalUrl);
