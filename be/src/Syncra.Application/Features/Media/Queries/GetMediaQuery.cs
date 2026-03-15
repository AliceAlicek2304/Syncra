using MediatR;
using Syncra.Application.DTOs.Media;

namespace Syncra.Application.Features.Media.Queries;

public record GetMediaQuery(
    Guid WorkspaceId,
    string? MediaType,
    bool? IsAttached,
    int Page,
    int PageSize) : IRequest<MediaListDto>;
