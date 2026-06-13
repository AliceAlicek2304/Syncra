using MediatR;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Admin.Queries.UserGrowth;

public record GetUserGrowthQuery : IRequest<Result<UserGrowthDto>>;
