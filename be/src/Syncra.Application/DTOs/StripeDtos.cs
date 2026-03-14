namespace Syncra.Application.DTOs;

/// <summary>
/// DTO representing a Stripe Customer
/// </summary>
public class StripeCustomerDto
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Name { get; set; }
    public Dictionary<string, string> Metadata { get; set; } = new();
}

/// <summary>
/// DTO representing a Stripe Checkout Session
/// </summary>
public class StripeCheckoutSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? CustomerId { get; set; }
    public string? ClientReferenceId { get; set; }
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, string> Metadata { get; set; } = new();
}
