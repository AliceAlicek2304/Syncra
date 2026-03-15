namespace Syncra.Application.DTOs.Integrations;

public record IntegrationDto(
    Guid Id,
    Guid WorkspaceId,
    string Platform,
    string? ExternalAccountId,
    bool IsActive,
    DateTime? ExpiresAtUtc,
    DateTime? TokenRefreshLastSuccessAtUtc,
    string? TokenRefreshHealthStatus,
    Dictionary<string, string>? Metadata
);