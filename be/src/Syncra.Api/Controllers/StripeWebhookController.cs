using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Options;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/stripe/webhook")]
public class StripeWebhookController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly StripeOptions _stripeOptions;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(
        IMediator mediator,
        IOptions<StripeOptions> stripeOptions,
        ILogger<StripeWebhookController> logger)
    {
        _mediator = mediator;
        _stripeOptions = stripeOptions.Value;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Index()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        try
        {
            var stripeEvent = EventUtility.ConstructEvent(json,
                Request.Headers["Stripe-Signature"], _stripeOptions.WebhookSecret);

            _logger.LogInformation("Received Stripe webhook event: {Type}", stripeEvent.Type);

            switch (stripeEvent.Type)
            {
                case "checkout.session.completed":
                {
                    var session = stripeEvent.Data.Object as Session;
                    _logger.LogInformation("Processing checkout.session.completed for Workspace: {WorkspaceId}", session.ClientReferenceId);
                    await _mediator.Send(new UpdateSubscriptionCommand(session.ClientReferenceId, session.SubscriptionId));
                    break;
                }
                case "customer.subscription.deleted":
                {
                    var subscription = stripeEvent.Data.Object as Subscription;
                    _logger.LogInformation("Processing customer.subscription.deleted for Subscription: {SubscriptionId}", subscription.Id);
                    await _mediator.Send(new CancelSubscriptionCommand(subscription.Id));
                    break;
                }
            }

            return Ok();
        }
        catch (StripeException e)
        {
            _logger.LogError(e, "Stripe webhook error: {Message}", e.Message);
            return BadRequest(new { error = e.Message });
        }
    }
}
