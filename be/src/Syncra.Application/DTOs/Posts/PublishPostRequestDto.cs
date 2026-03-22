namespace Syncra.Application.DTOs.Posts;

public record PublishPostRequestDto(
    bool DryRun = false,
    DateTime? ScheduledAtUtc = null,
    Guid? IntegrationId = null
);

