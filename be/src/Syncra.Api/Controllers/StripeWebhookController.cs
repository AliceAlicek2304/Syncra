using Microsoft.AspNetCore.Mvc;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/stripe/webhook")]
public class StripeWebhookController : ControllerBase
{
    private readonly PaymentWebhookOrchestrator _orchestrator;

    public StripeWebhookController(PaymentWebhookOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    [HttpPost]
    public async Task<IActionResult> Index(CancellationToken cancellationToken)
    {
        var payload = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
        var headers = Request.Headers.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString(), StringComparer.OrdinalIgnoreCase);

        return await _orchestrator.ProcessAsync(
            provider: "stripe",
            payload: payload,
            headers: headers,
            endpoint: "/api/payments/webhook/stripe",
            cancellationToken: cancellationToken);
    }
}
