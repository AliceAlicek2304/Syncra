using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.DTOs.Students;
using Syncra.Application.Features.Students.Commands;
using Syncra.Application.Features.Students.Queries;
using Syncra.Shared.Extensions;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/student-verification")]
public sealed class StudentVerificationController : ControllerBase
{
    private readonly IMediator _mediator;

    public StudentVerificationController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("status")]
    [ProducesResponseType(typeof(StudentVerificationStatusDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _mediator.Send(new GetStudentVerificationStatusQuery(userId.Value), cancellationToken);
        return Ok(result);
    }

    [HttpPost("request-code")]
    [ProducesResponseType(typeof(RequestStudentVerificationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RequestCode(
        [FromBody] RequestStudentVerificationRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _mediator.Send(
            new RequestStudentVerificationCommand(userId.Value, request.StudentEmail),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("verify-code")]
    [ProducesResponseType(typeof(VerifyStudentEmailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> VerifyCode(
        [FromBody] VerifyStudentEmailRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _mediator.Send(
            new VerifyStudentEmailCommand(userId.Value, request.StudentEmail, request.Code),
            cancellationToken);

        return Ok(result);
    }
}

public sealed record RequestStudentVerificationRequest(string StudentEmail);

public sealed record VerifyStudentEmailRequest(string StudentEmail, string Code);
