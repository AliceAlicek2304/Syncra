using MediatR;
using Syncra.Application.DTOs.Zernio;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Analytics.Queries;

public record GetContentDecayQuery(
    Guid WorkspaceId,
    string? Platform = null,
    string? ProfileId = null,
    string? AccountId = null,
    string? Source = null) : IRequest<Result<ZernioContentDecayResponseDto>>;
