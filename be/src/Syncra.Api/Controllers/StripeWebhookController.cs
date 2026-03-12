
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Options;

namespace Syncra.Api.Controllers
{
    [ApiController]
    [Route("api/stripe/webhook")]
    public class StripeWebhookController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly StripeOptions _stripeOptions;

        public StripeWebhookController(IMediator mediator, IOptions<StripeOptions> stripeOptions)
        {
            _mediator = mediator;
            _stripeOptions = stripeOptions.Value;
        }

        [HttpPost]
        public async Task<IActionResult> Index()
        {
            var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
            try
            {
                var stripeEvent = EventUtility.ConstructEvent(json,
                    Request.Headers["Stripe-Signature"], _stripeOptions.WebhookSecret);

                switch (stripeEvent.Type)
                {
                    case "checkout.session.completed":
                    {
                        var session = stripeEvent.Data.Object as Session;
                        var command = new UpdateSubscriptionCommand(session.ClientReferenceId, session.SubscriptionId);
                        await _mediator.Send(command);
                        break;
                    }
                    case "customer.subscription.deleted":
                    {
                        var subscription = stripeEvent.Data.Object as Subscription;
                        var command = new CancelSubscriptionCommand(subscription.Id);
                        await _mediator.Send(command);
                        break;
                    }
                }

                return Ok();
            }
            catch (StripeException e)
            {
                return BadRequest();
            }
        }
    }
}
