using MediatR;
using Syncra.Application.DTOs.Integrations;

namespace Syncra.Application.Features.Integrations.Queries;

public record GetIntegrationHealthQuery(
    Guid WorkspaceId,
    string ProviderId
) : IRequest<IntegrationHealthDto?>;

public record IntegrationHealthDto(
    string Status,
    string ProviderId,
    bool IsActive,
    bool IsTokenExpired,
    DateTime? ExpiresAtUtc,
    DateTime? LastRefreshAtUtc,
    string? LastRefreshError,
    string? AccountId,
    Dictionary<string, string>? Metadata
);