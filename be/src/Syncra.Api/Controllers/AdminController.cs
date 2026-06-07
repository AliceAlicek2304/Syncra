using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Syncra.Api.Common;
using Syncra.Application.Features.Admin.Queries;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(new GetAdminOverviewQuery(), cancellationToken);
        return result.ToActionResult();
    }
}
