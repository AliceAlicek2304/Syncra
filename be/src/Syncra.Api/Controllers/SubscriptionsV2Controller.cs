using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Billing;
using Syncra.Application.DTOs.Subscriptions;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Features.Subscriptions.Queries;
using Syncra.Api.Middleware;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v2/workspaces/{workspaceId}/subscription")]
public class SubscriptionsV2Controller : ControllerBase
{
    private readonly IMediator _mediator;

    public SubscriptionsV2Controller(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("create-checkout-session")]
    [ProducesResponseType(typeof(CreateCheckoutSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateCheckoutSession(
        Guid workspaceId,
        [FromBody] CreateCheckoutSessionByPlanRequest request,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.Items.TryGetValue(TenantResolutionMiddleware.WorkspaceIdKey, out var tenantId) || tenantId is not Guid validatedWorkspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id header is required." });
        }

        if (validatedWorkspaceId != workspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id must match route workspaceId." });
        }

        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var command = new CreateCheckoutSessionByPlanCommand(
            workspaceId,
            userId.Value,
            request.PlanCode,
            request.Interval,
            request.SuccessUrl,
            request.CancelUrl,
            request.DiscountCode,
            request.SkipTrial);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("vouchers/preview")]
    [ProducesResponseType(typeof(BillingVoucherPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PreviewVoucher(
        Guid workspaceId,
        [FromBody] PreviewBillingVoucherRequest request,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.Items.TryGetValue(TenantResolutionMiddleware.WorkspaceIdKey, out var tenantId) || tenantId is not Guid validatedWorkspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id header is required." });
        }

        if (validatedWorkspaceId != workspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id must match route workspaceId." });
        }

        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var result = await _mediator.Send(new PreviewBillingVoucherQuery(
            workspaceId,
            userId.Value,
            request.PlanCode,
            request.Interval,
            request.VoucherCode),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("create-portal-session")]
    [ProducesResponseType(typeof(CreatePortalSessionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePortalSession(
        Guid workspaceId,
        [FromBody] CreatePortalSessionRequest request,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.Items.TryGetValue(TenantResolutionMiddleware.WorkspaceIdKey, out var tenantId) || tenantId is not Guid validatedWorkspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id header is required." });
        }

        if (validatedWorkspaceId != workspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id must match route workspaceId." });
        }

        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var command = new CreatePortalSessionCommand(workspaceId, userId.Value, request.ReturnUrl);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("start-trial")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> StartTrial(
        Guid workspaceId,
        [FromBody] StartTrialRequest request,
        CancellationToken cancellationToken)
    {
        if (!HttpContext.Items.TryGetValue(TenantResolutionMiddleware.WorkspaceIdKey, out var tenantId) || tenantId is not Guid validatedWorkspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id header is required." });
        }

        if (validatedWorkspaceId != workspaceId)
        {
            return BadRequest(new { statusCode = 400, message = "X-Workspace-Id must match route workspaceId." });
        }

        var userId = User.GetUserId();
        if (userId == null)
        {
            return Unauthorized();
        }

        var command = new StartTrialCommand(workspaceId, userId.Value, request.PlanCode);
        await _mediator.Send(command, cancellationToken);
        return Ok(new { message = "Trial started successfully." });
    }
}

public record StartTrialRequest(string PlanCode);
