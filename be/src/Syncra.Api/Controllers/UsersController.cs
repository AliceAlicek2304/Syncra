using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Features.Users.Queries;
using Syncra.Application.Features.Users.Commands;
using Syncra.Shared.Extensions;
using MediatR;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var query = new GetUserProfileQuery(userId.Value);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var command = new UpdateUserProfileCommand(
            userId.Value,
            request.DisplayName,
            request.FirstName,
            request.LastName,
            request.Timezone,
            request.Locale);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }
}

public record UpdateUserProfileRequest(
    string? DisplayName,
    string? FirstName,
    string? LastName,
    string? Timezone,
    string? Locale);
