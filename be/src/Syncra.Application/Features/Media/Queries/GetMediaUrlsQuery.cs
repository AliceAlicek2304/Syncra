using MediatR;
using Syncra.Application.DTOs.Media;

namespace Syncra.Application.Features.Media.Queries;

public record GetMediaUrlsQuery(Guid WorkspaceId, IReadOnlyCollection<Guid> MediaIds) : IRequest<IReadOnlyCollection<MediaUrlDto>>;
