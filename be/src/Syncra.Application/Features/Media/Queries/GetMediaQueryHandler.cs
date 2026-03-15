using MediatR;
using Syncra.Application.DTOs.Media;
using Syncra.Domain.Interfaces;
using MediaEntity = Syncra.Domain.Entities.Media;

namespace Syncra.Application.Features.Media.Queries;

public class GetMediaQueryHandler : IRequestHandler<GetMediaQuery, MediaListDto>
{
    private readonly IMediaRepository _mediaRepository;

    public GetMediaQueryHandler(IMediaRepository mediaRepository)
    {
        _mediaRepository = mediaRepository;
    }

    public async Task<MediaListDto> Handle(GetMediaQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await _mediaRepository.GetByWorkspaceIdAsync(
            request.WorkspaceId,
            request.MediaType,
            request.IsAttached,
            request.Page,
            request.PageSize,
            cancellationToken);

        var dtos = items.Select(ToDto);
        return new MediaListDto(dtos, totalCount, request.Page, request.PageSize);
    }

    private static MediaDto ToDto(MediaEntity m) =>
        new(m.Id, m.WorkspaceId, m.FileName, m.FileUrl, m.MediaType, m.MimeType, m.SizeBytes, m.PostId, m.CreatedAtUtc);
}
