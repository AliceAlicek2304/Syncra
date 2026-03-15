using MediatR;
using Syncra.Application.DTOs.Media;

namespace Syncra.Application.Features.Media.Commands;

public record UploadMediaCommand(
    Guid WorkspaceId,
    Stream FileStream,
    string FileName,
    string ContentType,
    long SizeBytes) : IRequest<MediaDto>;
