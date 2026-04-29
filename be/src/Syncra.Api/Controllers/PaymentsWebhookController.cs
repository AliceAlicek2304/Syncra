using Microsoft.AspNetCore.Mvc;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/payments/webhook/{provider}")]
public class PaymentsWebhookController : ControllerBase
{
    private readonly PaymentWebhookOrchestrator _orchestrator;

    public PaymentsWebhookController(PaymentWebhookOrchestrator orchestrator)
    {
        _orchestrator = orchestrator;
    }

    [HttpPost]
    public async Task<IActionResult> Index(string provider, CancellationToken cancellationToken)
    {
        var payload = await new StreamReader(HttpContext.Request.Body).ReadToEndAsync(cancellationToken);
        var headers = Request.Headers.ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        var endpoint = $"/api/payments/webhook/{provider}";

        return await _orchestrator.ProcessAsync(provider, payload, headers, endpoint, cancellationToken);
    }
}
