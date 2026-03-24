using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Features.Media.Commands;
using Syncra.Application.Features.Media.Queries;


namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/media")]
public class MediaController : ControllerBase
{
    private readonly IMediator _mediator;

    public MediaController(IMediator mediator) => _mediator = mediator;

    public class GetMediaUrlsRequest { public Guid[] MediaIds { get; set; } = Array.Empty<Guid>(); }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(Guid workspaceId, [FromForm] IFormFile file, [FromForm] Guid? postId, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest("File is required.");

        await using var stream = file.OpenReadStream();
        var result = await _mediator.Send(
            new UploadMediaCommand(workspaceId, stream, file.FileName, file.ContentType, file.Length, postId),
            cancellationToken);

        return CreatedAtAction(nameof(List), new { workspaceId }, result);
    }

    [HttpGet]
    public async Task<IActionResult> List(
        Guid workspaceId,
        [FromQuery] string? mediaType,
        [FromQuery] bool? isAttached,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetMediaQuery(workspaceId, mediaType, isAttached, page, pageSize),
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("urls")]
    public async Task<IActionResult> Urls(Guid workspaceId, [FromBody] GetMediaUrlsRequest request, CancellationToken cancellationToken)
    {
        if (request?.MediaIds == null || request.MediaIds.Length == 0)
            return Ok(Array.Empty<object>());

        var result = await _mediator.Send(new GetMediaUrlsQuery(workspaceId, request.MediaIds), cancellationToken);
        return Ok(result);
    }

    [HttpDelete("{mediaId}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid mediaId, CancellationToken cancellationToken)
    {
        await _mediator.Send(new DeleteMediaCommand(workspaceId, mediaId), cancellationToken);
        return NoContent();
    }
}
