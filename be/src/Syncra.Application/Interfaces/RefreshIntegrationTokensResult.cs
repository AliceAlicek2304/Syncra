namespace Syncra.Application.Interfaces;

public sealed record RefreshIntegrationTokensResult(
    int TotalConsidered,
    int SkippedNotEligible,
    int SkippedNotExpiring,
    int Attempted,
    int Refreshed,
    int Failed);

