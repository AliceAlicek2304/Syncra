using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Features.Users.Queries;
using Syncra.Shared.Extensions;
using MediatR;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto registerDto, CancellationToken cancellationToken)
    {
        var command = new RegisterCommand(
            registerDto.Email,
            registerDto.Password,
            registerDto.FirstName,
            registerDto.LastName);

        var result = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(nameof(Register), new { id = result }, new { Message = "User registered successfully." });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto loginDto, CancellationToken cancellationToken)
    {
        var command = new LoginCommand(loginDto.Email, loginDto.Password);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshDto refreshDto, CancellationToken cancellationToken)
    {
        var command = new RefreshTokenCommand(refreshDto.RefreshToken);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
            return Unauthorized();

        var query = new GetCurrentUserQuery(userId.Value);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }
}
