using MediatR;
using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Users.Queries;

public record GetCurrentUserQuery(Guid UserId) : IRequest<UserDto>;