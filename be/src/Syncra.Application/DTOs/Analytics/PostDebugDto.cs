namespace Syncra.Application.DTOs.Analytics;

public record PostDebugDto(
    Guid PostId,
    Guid WorkspaceId,
    bool WorkspaceMatch,
    string Status,
    string? PublishExternalId,
    string? PublishExternalUrl,
    Guid? IntegrationId,
    string? IntegrationPlatform,
    string? IntegrationExternalAccountId,
    bool IntegrationHasToken,
    DateTime? IntegrationTokenExpiresAt,
    bool? IntegrationIsActive);
