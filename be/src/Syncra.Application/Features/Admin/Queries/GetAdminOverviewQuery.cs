using MediatR;
using Syncra.Application.DTOs;
using Syncra.Domain.Common;

namespace Syncra.Application.Features.Admin.Queries;

public record GetAdminOverviewQuery() : IRequest<Result<AdminOverviewDto>>;
