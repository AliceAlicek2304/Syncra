using MediatR;
using Syncra.Application.DTOs.Media;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Media.Queries;

public class GetMediaUrlsQueryHandler : IRequestHandler<GetMediaUrlsQuery, IReadOnlyCollection<MediaUrlDto>>
{
    private readonly IMediaRepository _mediaRepository;

    public GetMediaUrlsQueryHandler(IMediaRepository mediaRepository) => _mediaRepository = mediaRepository;

    public async Task<IReadOnlyCollection<MediaUrlDto>> Handle(GetMediaUrlsQuery request, CancellationToken cancellationToken)
    {
        if (request.MediaIds == null || request.MediaIds.Count == 0)
            return Array.Empty<MediaUrlDto>();

        var items = await _mediaRepository.GetByIdsAsync(request.MediaIds);
        var mapped = items.Select(m => new MediaUrlDto(m.Id, m.FileUrl)).ToList().AsReadOnly();
        return mapped;
    }
}
