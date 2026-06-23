using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Syncra.Api.Common;
using Syncra.Application.Features.Admin.Queries;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("access")]
    public IActionResult CheckAccess()
    {
        return Ok(new { allowed = true });
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAdminOverviewQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("users-growth")]
    public async Task<IActionResult> GetUserGrowth(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new Syncra.Application.Features.Admin.Queries.UserGrowth.GetUserGrowthQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("posts-analytics")]
    public async Task<IActionResult> GetPostAnalytics(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new Syncra.Application.Features.Admin.Queries.PostAnalytics.GetPostAnalyticsQuery(), cancellationToken);
        return result.ToActionResult();
    }

    [HttpGet("revenue-analytics")]
    public async Task<IActionResult> GetRevenueAnalytics(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new Syncra.Application.Features.Admin.Queries.RevenueAnalytics.GetRevenueAnalyticsQuery(), cancellationToken);
        return result.ToActionResult();
    }
}
