using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/stripe/webhook")]
public class StripeWebhookController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly StripeOptions _stripeOptions;
    private readonly ILogger<StripeWebhookController> _logger;
    private readonly AppDbContext _db;

    public StripeWebhookController(
        IMediator mediator,
        IOptions<StripeOptions> stripeOptions,
        ILogger<StripeWebhookController> logger,
        AppDbContext db)
    {
        _mediator = mediator;
        _stripeOptions = stripeOptions.Value;
        _logger = logger;
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Index()
    {
        var json = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync();
        try
        {
            var signatureHeader = Request.Headers["Stripe-Signature"].FirstOrDefault();
            if (string.IsNullOrEmpty(signatureHeader))
            {
                return BadRequest(new { error = "Missing Stripe-Signature header" });
            }

            var stripeEvent = EventUtility.ConstructEvent(json,
                signatureHeader, _stripeOptions.WebhookSecret);

            _logger.LogInformation("Received Stripe webhook event: {Type} with ID: {EventId}", stripeEvent.Type, stripeEvent.Id);

            var eventId = stripeEvent.Id;
            var idempotencyKey = $"stripe_event_{eventId}";

            var record = await _db.IdempotencyRecords
                .FirstOrDefaultAsync(r => r.Key == idempotencyKey);

            if (record != null)
            {
                if (record.Status == IdempotencyStatus.Pending)
                {
                    _logger.LogWarning("Duplicate Stripe webhook event {EventId} is currently being processed.", eventId);
                    return Conflict("Event processing in progress");
                }

                if (record.Status == IdempotencyStatus.Success)
                {
                    _logger.LogInformation("Duplicate Stripe webhook event {EventId} was already processed successfully.", eventId);
                    return Ok();
                }

                if (record.Status == IdempotencyStatus.Failure)
                {
                    _logger.LogInformation("Retrying failed Stripe webhook event {EventId}.", eventId);
                    record.Status = IdempotencyStatus.Pending;
                }
            }
            else
            {
                record = new IdempotencyRecord
                {
                    Key = idempotencyKey,
                    RequestHash = eventId,
                    Endpoint = "/api/stripe/webhook",
                    Method = "POST",
                    Status = IdempotencyStatus.Pending,
                    ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
                };

                // Extract WorkspaceId if available
                if (stripeEvent.Data.Object is Stripe.Checkout.Session session && !string.IsNullOrEmpty(session.ClientReferenceId))
                {
                    if (Guid.TryParse(session.ClientReferenceId, out var workspaceId))
                    {
                        record.WorkspaceId = workspaceId;
                    }
                }
                else if (stripeEvent.Data.Object is Stripe.Subscription subscription && subscription.Metadata != null && subscription.Metadata.TryGetValue("WorkspaceId", out var wsId))
                {
                    if (Guid.TryParse(wsId, out var workspaceId))
                    {
                        record.WorkspaceId = workspaceId;
                    }
                }

                _db.IdempotencyRecords.Add(record);
            }

            await _db.SaveChangesAsync();

            try
            {
                switch (stripeEvent.Type)
                {
                    case "checkout.session.completed":
                    {
                        var session = stripeEvent.Data.Object as Stripe.Checkout.Session;
                        _logger.LogInformation("Processing checkout.session.completed for Workspace: {WorkspaceId}", session.ClientReferenceId);
                        await _mediator.Send(new UpdateSubscriptionCommand(session.ClientReferenceId, session.SubscriptionId));
                        break;
                    }
                    case "customer.subscription.deleted":
                    {
                        var subscription = stripeEvent.Data.Object as Stripe.Subscription;
                        _logger.LogInformation("Processing customer.subscription.deleted for Subscription: {SubscriptionId}", subscription.Id);
                        await _mediator.Send(new CancelSubscriptionCommand(subscription.Id));
                        break;
                    }
                }

                record.Status = IdempotencyStatus.Success;
                record.CompletedAtUtc = DateTime.UtcNow;
                record.ResponseStatusCode = 200;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Stripe webhook event {EventId}", eventId);
                record.Status = IdempotencyStatus.Failure;
                record.ResponseBody = ex.Message;
                throw;
            }
            finally
            {
                await _db.SaveChangesAsync();
            }

            return Ok();
        }
        catch (StripeException e)
        {
            _logger.LogError(e, "Stripe webhook error: {Message}", e.Message);
            return BadRequest(new { error = e.Message });
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Internal error processing Stripe webhook event");
            return StatusCode(500, e.ToString());
        }
    }
}
