namespace Syncra.Application.DTOs.Integrations;

public sealed record IntegrationPageDto(
    string PageId,
    string? PageName,
    string? Category,
    bool IsActive
);
