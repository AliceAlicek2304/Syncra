using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Users.Queries;

public record GetUserProfileQuery(Guid UserId) : IRequest<UserProfileDto>;