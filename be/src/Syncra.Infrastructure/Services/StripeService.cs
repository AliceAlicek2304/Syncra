using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using SessionService = Stripe.Checkout.SessionService;
using SessionCreateOptions = Stripe.Checkout.SessionCreateOptions;
using SessionLineItemOptions = Stripe.Checkout.SessionLineItemOptions;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Application.Repositories;
using Syncra.Domain.Entities;

namespace Syncra.Infrastructure.Services;

public class StripeService : IStripeService
{
    private readonly StripeOptions _stripeOptions;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<StripeService> _logger;

    public StripeService(
        IOptions<StripeOptions> stripeOptions,
        IWorkspaceRepository workspaceRepository,
        IUnitOfWork unitOfWork,
        ILogger<StripeService> logger)
    {
        _stripeOptions = stripeOptions.Value;
        _workspaceRepository = workspaceRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;

        // Set the Stripe API key globally
        StripeConfiguration.ApiKey = _stripeOptions.SecretKey;
    }

    public async Task<StripeCustomerDto> GetOrCreateCustomerAsync(Workspace workspace, CancellationToken cancellationToken = default)
    {
        // Check if workspace already has a Stripe customer ID
        if (!string.IsNullOrEmpty(workspace.StripeCustomerId))
        {
            try
            {
                var customerService = new CustomerService();
                var existingCustomer = await customerService.GetAsync(workspace.StripeCustomerId, cancellationToken: cancellationToken);
                _logger.LogInformation("Retrieved existing Stripe customer {CustomerId} for workspace {WorkspaceId}",
                    workspace.StripeCustomerId, workspace.Id);
                return MapToDto(existingCustomer);
            }
            catch (StripeException ex)
            {
                _logger.LogWarning(ex, "Failed to retrieve existing Stripe customer {CustomerId} for workspace {WorkspaceId}. Will create new customer.",
                    workspace.StripeCustomerId, workspace.Id);
                // Continue to create a new customer
            }
        }

        // Create new Stripe customer
        var customerOptions = new CustomerCreateOptions
        {
            Metadata = new Dictionary<string, string>
            {
                { "workspace_id", workspace.Id.ToString() },
                { "workspace_name", workspace.Name }
            }
        };

        var customerService2 = new CustomerService();
        var customer = await customerService2.CreateAsync(customerOptions, cancellationToken: cancellationToken);

        // Save the Stripe customer ID to the workspace
        workspace.StripeCustomerId = customer.Id;
        await _workspaceRepository.UpdateAsync(workspace);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created new Stripe customer {CustomerId} for workspace {WorkspaceId}",
            customer.Id, workspace.Id);

        return MapToDto(customer);
    }

    public async Task<StripeCheckoutSessionDto> CreateCheckoutSessionAsync(
        Workspace workspace,
        string priceId,
        string successUrl,
        string cancelUrl,
        CancellationToken cancellationToken = default)
    {
        // Get or create the Stripe customer
        var customer = await GetOrCreateCustomerAsync(workspace, cancellationToken);

        var sessionOptions = new SessionCreateOptions
        {
            Customer = customer.Id,
            ClientReferenceId = workspace.Id.ToString(),
            PaymentMethodTypes = new List<string> { "card" },
            LineItems = new List<SessionLineItemOptions>
            {
                new SessionLineItemOptions
                {
                    Price = priceId,
                    Quantity = 1
                }
            },
            Mode = "subscription",
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            Metadata = new Dictionary<string, string>
            {
                { "workspace_id", workspace.Id.ToString() }
            }
        };

        var sessionService = new SessionService();
        var session = await sessionService.CreateAsync(sessionOptions, cancellationToken: cancellationToken);

        _logger.LogInformation("Created Stripe checkout session {SessionId} for workspace {WorkspaceId} with price {PriceId}",
            session.Id, workspace.Id, priceId);

        return MapToDto(session);
    }

    private static StripeCustomerDto MapToDto(Customer customer)
    {
        return new StripeCustomerDto
        {
            Id = customer.Id,
            Email = customer.Email,
            Name = customer.Name,
            Metadata = customer.Metadata ?? new Dictionary<string, string>()
        };
    }

    private static StripeCheckoutSessionDto MapToDto(Stripe.Checkout.Session session)
    {
        return new StripeCheckoutSessionDto
        {
            Id = session.Id,
            Url = session.Url,
            CustomerId = session.CustomerId,
            ClientReferenceId = session.ClientReferenceId,
            Status = session.Status,
            Metadata = session.Metadata ?? new Dictionary<string, string>()
        };
    }
}
