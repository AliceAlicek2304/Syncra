using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs;
using Syncra.Application.DTOs.Auth;
using Syncra.Application.Features.Auth.Commands;
using Syncra.Application.Features.Auth.Queries;
using Syncra.Application.Features.Users.Queries;
using Syncra.Domain.Interfaces;
using Syncra.Shared.Extensions;
using MediatR;

namespace Syncra.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IEnumerable<IOAuthProvider> _providers;

    public AuthController(IMediator mediator, IEnumerable<IOAuthProvider> providers)
    {
        _mediator = mediator;
        _providers = providers;
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

    [AllowAnonymous]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var command = new ForgotPasswordCommand(request.Email);
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var command = new ResetPasswordCommand(request.Token, request.NewPassword);
        await _mediator.Send(command, cancellationToken);
        return Ok(new { message = "Password has been reset successfully." });
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

    [HttpGet("oauth/{provider}/login")]
    public IActionResult GetOAuthLoginUrl(string provider, [FromQuery] string returnUrl)
    {
        var providerInstance = _providers.FirstOrDefault(p => p.ProviderName.Equals(provider, StringComparison.OrdinalIgnoreCase));
        if (providerInstance == null)
        {
            return BadRequest(new { error = "unsupported_provider", message = $"Provider '{provider}' is not supported." });
        }

        var loginUrl = providerInstance.GetLoginUrl(returnUrl ?? "/");
        return Ok(new { loginUrl });
    }

    [HttpPost("oauth/{provider}/callback")]
    public async Task<IActionResult> OAuthCallback(string provider, [FromBody] OAuthCallbackRequest request, CancellationToken cancellationToken)
    {
        var command = new OAuthLoginCommand(provider, request.Code, request.State, request.ReturnUrl ?? "/");
        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [HttpPost("link")]
    public async Task<IActionResult> LinkAccount([FromBody] LinkAccountDto linkAccountDto, CancellationToken cancellationToken)
    {
        var command = new LinkAccountCommand(
            linkAccountDto.Email,
            linkAccountDto.Password,
            linkAccountDto.Provider,
            linkAccountDto.ProviderKey);

        var result = await _mediator.Send(command, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("linked-accounts")]
    public async Task<IActionResult> GetLinkedAccounts(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var query = new GetLinkedAccountsQuery(userId.Value);
        var result = await _mediator.Send(query, cancellationToken);
        return Ok(result);
    }

    [Authorize]
    [HttpDelete("link/{provider}")]
    public async Task<IActionResult> UnlinkAccount(string provider, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null) return Unauthorized();

        var command = new UnlinkAccountCommand(userId.Value, provider);
        await _mediator.Send(command, cancellationToken);
        return NoContent();
    }
}

public record OAuthCallbackRequest(string Code, string State, string? ReturnUrl);

public record ForgotPasswordRequest(string Email);

public record ResetPasswordRequest(string Token, string NewPassword);
