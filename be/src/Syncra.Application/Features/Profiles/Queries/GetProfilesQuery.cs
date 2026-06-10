using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Profiles.Queries;

public record GetProfilesQuery(Guid WorkspaceId) : IRequest<IReadOnlyList<ProfileDto>>;
