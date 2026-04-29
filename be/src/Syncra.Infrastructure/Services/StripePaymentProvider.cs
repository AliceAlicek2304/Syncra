using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using SessionCreateOptions = Stripe.Checkout.SessionCreateOptions;
using SessionLineItemOptions = Stripe.Checkout.SessionLineItemOptions;
using SessionService = Stripe.Checkout.SessionService;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Services;

public sealed class StripePaymentProvider : IPaymentProvider
{
    public string ProviderKey => "stripe";

    private readonly StripeOptions _stripeOptions;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<StripePaymentProvider> _logger;

    public StripePaymentProvider(
        IOptions<StripeOptions> stripeOptions,
        IWorkspaceRepository workspaceRepository,
        IUnitOfWork unitOfWork,
        ILogger<StripePaymentProvider> logger)
    {
        _stripeOptions = stripeOptions.Value;
        _workspaceRepository = workspaceRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<PaymentCheckoutSessionResult> CreateCheckoutSessionAsync(
        PaymentCheckoutSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var providerCustomerId = await GetOrCreateCustomerIdAsync(request, cancellationToken);

        var sessionOptions = new SessionCreateOptions
        {
            Customer = providerCustomerId,
            ClientReferenceId = request.WorkspaceId.ToString(),
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new()
                {
                    Price = request.PriceId,
                    Quantity = 1
                }
            },
            Mode = "subscription",
            SuccessUrl = request.SuccessUrl,
            CancelUrl = request.CancelUrl,
            Metadata = new Dictionary<string, string>
            {
                { "workspace_id", request.WorkspaceId.ToString() },
                { "workspace_name", request.WorkspaceName }
            }
        };

        try
        {
            var sessionService = new SessionService();
            var session = await sessionService.CreateAsync(
                sessionOptions,
                requestOptions: GetRequestOptions(),
                cancellationToken: cancellationToken);

            _logger.LogInformation(
                "Created Stripe checkout session {SessionId} for workspace {WorkspaceId}",
                session.Id,
                request.WorkspaceId);

            return new PaymentCheckoutSessionResult(
                SessionId: session.Id,
                CheckoutUrl: session.Url,
                ProviderCustomerId: session.CustomerId,
                ClientReferenceId: session.ClientReferenceId);
        }
        catch (StripeException ex) when (ex.StripeError?.Type == "invalid_request_error")
        {
            throw new DomainException("provider_request_error", $"Payment provider rejected the request: {ex.StripeError?.Message ?? ex.Message}", ex);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe API error creating checkout session for workspace {WorkspaceId}", request.WorkspaceId);
            throw new DomainException("provider_error", $"Payment provider error: {ex.StripeError?.Message ?? ex.Message}", ex);
        }
    }

    public async Task<PaymentPortalSessionResult> CreatePortalSessionAsync(
        PaymentPortalSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var providerCustomerId = await GetOrCreateCustomerIdAsync(
            new PaymentCheckoutSessionRequest(
                request.WorkspaceId,
                request.WorkspaceName,
                request.ProviderCustomerId,
                string.Empty,
                string.Empty,
                string.Empty),
            cancellationToken);

        var options = new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = providerCustomerId,
            ReturnUrl = request.ReturnUrl
        };

        try
        {
            var service = new Stripe.BillingPortal.SessionService();
            var session = await service.CreateAsync(
                options,
                requestOptions: GetRequestOptions(),
                cancellationToken: cancellationToken);

            return new PaymentPortalSessionResult(session.Url);
        }
        catch (StripeException ex) when (ex.StripeError?.Type == "invalid_request_error")
        {
            throw new DomainException("provider_request_error", $"Payment provider rejected the request: {ex.StripeError?.Message ?? ex.Message}", ex);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe API error creating portal session for workspace {WorkspaceId}", request.WorkspaceId);
            throw new DomainException("provider_error", $"Payment provider error: {ex.StripeError?.Message ?? ex.Message}", ex);
        }
    }

    public Task<PaymentWebhookParseResult> ParseWebhookAsync(
        PaymentWebhookRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!request.Headers.TryGetValue("Stripe-Signature", out var signatureHeader) || string.IsNullOrWhiteSpace(signatureHeader))
            {
                return Task.FromResult(new PaymentWebhookParseResult(false, "Missing Stripe-Signature header", null));
            }

            var stripeEvent = EventUtility.ConstructEvent(request.Payload, signatureHeader, _stripeOptions.WebhookSecret);
            return Task.FromResult(new PaymentWebhookParseResult(true, null, MapEvent(stripeEvent)));
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Failed to parse Stripe webhook event");
            return Task.FromResult(new PaymentWebhookParseResult(false, ex.Message, null));
        }
    }

    private RequestOptions GetRequestOptions()
    {
        return new RequestOptions
        {
            ApiKey = _stripeOptions.SecretKey
        };
    }

    private async Task<string> GetOrCreateCustomerIdAsync(
        PaymentCheckoutSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(request.ProviderCustomerId))
        {
            try
            {
                var customerService = new CustomerService();
                var existing = await customerService.GetAsync(
                    request.ProviderCustomerId,
                    requestOptions: GetRequestOptions(),
                    cancellationToken: cancellationToken);

                if (!string.IsNullOrWhiteSpace(existing.Id))
                {
                    return existing.Id;
                }
            }
            catch (StripeException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Unable to load existing Stripe customer {CustomerId} for workspace {WorkspaceId}. Creating a new customer.",
                    request.ProviderCustomerId,
                    request.WorkspaceId);
            }
        }

        var customerOptions = new CustomerCreateOptions
        {
            Metadata = new Dictionary<string, string>
            {
                { "workspace_id", request.WorkspaceId.ToString() },
                { "workspace_name", request.WorkspaceName }
            }
        };

        var customerService2 = new CustomerService();
        var created = await customerService2.CreateAsync(
            customerOptions,
            requestOptions: GetRequestOptions(),
            cancellationToken: cancellationToken);

        var workspace = await _workspaceRepository.GetByIdAsync(request.WorkspaceId);
        if (workspace != null)
        {
            workspace.SetBillingIdentity(ProviderKey, created.Id);
            await _workspaceRepository.UpdateAsync(workspace);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return created.Id;
    }

    private static PaymentWebhookEvent MapEvent(Event stripeEvent)
    {
        var webhookEvent = new PaymentWebhookEvent
        {
            Provider = "stripe",
            EventId = stripeEvent.Id,
            EventType = stripeEvent.Type,
            Metadata = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        };

        if (stripeEvent.Data.Object is Stripe.Checkout.Session session)
        {
            webhookEvent.ProviderCustomerId = session.CustomerId;
            webhookEvent.ProviderSubscriptionId = session.SubscriptionId;

            if (Guid.TryParse(session.ClientReferenceId, out var workspaceId))
            {
                webhookEvent.WorkspaceId = workspaceId;
            }

            if (session.Metadata != null)
            {
                foreach (var (key, value) in session.Metadata)
                {
                    webhookEvent.Metadata[key] = value;
                }
            }
        }
        else if (stripeEvent.Data.Object is Stripe.Subscription subscription)
        {
            webhookEvent.ProviderCustomerId = subscription.CustomerId;
            webhookEvent.ProviderSubscriptionId = subscription.Id;

            if (subscription.Metadata != null)
            {
                foreach (var (key, value) in subscription.Metadata)
                {
                    webhookEvent.Metadata[key] = value;
                }

                if (subscription.Metadata.TryGetValue("WorkspaceId", out var workspaceIdText)
                    && Guid.TryParse(workspaceIdText, out var workspaceId))
                {
                    webhookEvent.WorkspaceId = workspaceId;
                }
            }
        }

        return webhookEvent;
    }
}
