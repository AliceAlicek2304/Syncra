
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Options;
using Microsoft.Extensions.Options;
using Syncra.Application.Interfaces;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/media")]
public class MediaController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly MediaOptions _mediaOptions;

    public MediaController(IStorageService storageService, IOptions<MediaOptions> mediaOptions)
    {
        _storageService = storageService;
        _mediaOptions = mediaOptions.Value;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(Guid workspaceId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("File is required.");
        }

        if (file.Length > _mediaOptions.MaxFileSize)
        {
            return BadRequest($"File size cannot exceed {_mediaOptions.MaxFileSize / 1024 / 1024}MB.");
        }

        if (!_mediaOptions.AllowedMimeTypes.Contains(file.ContentType))
        {
            return BadRequest($"File type not allowed. Allowed types: {string.Join(", ", _mediaOptions.AllowedMimeTypes)}.");
        }

        await using var stream = file.OpenReadStream();
        var result = await _storageService.SaveAsync(stream, file.FileName, file.ContentType);

        return Ok(result);
    }
}
