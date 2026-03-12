
using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Syncra.Application.Options;
using Microsoft.Extensions.Options;
using Syncra.Application.Interfaces;

using Syncra.Application.Repositories;
using Syncra.Domain.Entities;

namespace Syncra.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/workspaces/{workspaceId}/media")]
public class MediaController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly IMediaRepository _mediaRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly MediaOptions _mediaOptions;

    public MediaController(
        IStorageService storageService, 
        IMediaRepository mediaRepository,
        IUnitOfWork unitOfWork,
        IOptions<MediaOptions> mediaOptions)
    {
        _storageService = storageService;
        _mediaRepository = mediaRepository;
        _unitOfWork = unitOfWork;
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
        var storageResult = await _storageService.SaveAsync(stream, file.FileName, file.ContentType);

        var media = new Media
        {
            WorkspaceId = workspaceId,
            FileName = file.FileName,
            FileUrl = storageResult.PublicUrl,
            MimeType = file.ContentType,
            SizeBytes = file.Length,
            MediaType = file.ContentType.StartsWith("image/") ? "image" : "video" // Simple logic for now
        };

        await _mediaRepository.AddAsync(media);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new
        {
            media.Id,
            media.FileName,
            media.FileUrl,
            media.MediaType,
            media.MimeType,
            media.SizeBytes
        });
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
        var (items, totalCount) = await _mediaRepository.GetByWorkspaceIdAsync(
            workspaceId,
            mediaType,
            isAttached,
            page,
            pageSize,
            cancellationToken);

        return Ok(new
        {
            Items = items.Select(m => new
            {
                m.Id,
                m.FileName,
                m.FileUrl,
                m.MediaType,
                m.MimeType,
                m.SizeBytes,
                m.PostId,
                m.CreatedAtUtc
            }),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpDelete("{mediaId}")]
    public async Task<IActionResult> Delete(Guid workspaceId, Guid mediaId, CancellationToken cancellationToken)
    {
        var media = await _mediaRepository.GetByIdAsync(mediaId);

        if (media == null || media.WorkspaceId != workspaceId)
        {
            return NotFound();
        }

        if (media.PostId.HasValue)
        {
            return Conflict("Cannot delete media that is attached to a post.");
        }

        // The storage key is derived from the FileUrl
        var storageKey = Path.GetFileName(media.FileUrl);
        await _storageService.DeleteAsync(storageKey);

        await _mediaRepository.DeleteAsync(media.Id);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
