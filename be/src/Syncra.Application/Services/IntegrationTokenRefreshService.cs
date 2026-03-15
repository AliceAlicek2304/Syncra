using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Syncra.Application.Interfaces;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Entities;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Application.Services;

public sealed class IntegrationTokenRefreshService : IIntegrationTokenRefreshService
{
    private static readonly TimeSpan DefaultRefreshWindow = TimeSpan.FromMinutes(5);

    private readonly IIntegrationRepository _integrationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IReadOnlyList<ISocialProvider> _providers;

    public IntegrationTokenRefreshService(
        IIntegrationRepository integrationRepository,
        IUnitOfWork unitOfWork,
        IEnumerable<ISocialProvider> providers)
    {
        _integrationRepository = integrationRepository;
        _unitOfWork = unitOfWork;
        _providers = providers.ToList();
    }

    public async Task<RefreshIntegrationTokensResult> RefreshExpiringIntegrationsAsync(
        CancellationToken cancellationToken = default)
    {
        var utcNow = DateTime.UtcNow;
        var refreshBeforeUtc = utcNow.Add(DefaultRefreshWindow);

        var integrations = (await _integrationRepository.GetAllAsync())
            .OrderBy(i => i.Id)
            .ToList();

        var skippedNotEligible = 0;
        var skippedNotExpiring = 0;
        var attempted = 0;
        var refreshed = 0;
        var failed = 0;

        foreach (var integration in integrations)
        {
            if (!IsEligible(integration))
            {
                skippedNotEligible++;
                continue;
            }

            if (!NeedsRefresh(integration, refreshBeforeUtc))
            {
                skippedNotExpiring++;
                continue;
            }

            attempted++;

            var provider = GetProviderOrDefault(integration.Platform);
            if (provider is null)
            {
                integration.MarkTokenRefreshFailure(utcNow, $"Social provider '{integration.Platform}' is not registered.");
                await _integrationRepository.UpdateAsync(integration);
                failed++;
                continue;
            }

            try
            {
                var result = await provider.RefreshTokenAsync(integration.RefreshToken!, cancellationToken);
                if (result.IsSuccess)
                {
                    integration.UpdateTokens(
                        accessToken: result.AccessToken,
                        refreshToken: result.RefreshToken,
                        expiresAtUtc: result.ExpiresAt?.UtcDateTime);
                    integration.MarkTokenRefreshSuccess(utcNow);
                    refreshed++;
                }
                else
                {
                    integration.MarkTokenRefreshFailure(utcNow, FormatProviderError(result));
                    failed++;
                }

                await _integrationRepository.UpdateAsync(integration);
            }
            catch (Exception ex)
            {
                integration.MarkTokenRefreshFailure(utcNow, ex.Message);
                await _integrationRepository.UpdateAsync(integration);
                failed++;
            }
        }

        if (attempted > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return new RefreshIntegrationTokensResult(
            TotalConsidered: integrations.Count,
            SkippedNotEligible: skippedNotEligible,
            SkippedNotExpiring: skippedNotExpiring,
            Attempted: attempted,
            Refreshed: refreshed,
            Failed: failed);
    }

    private static bool IsEligible(Integration integration) =>
        integration.IsActive &&
        !string.IsNullOrWhiteSpace(integration.RefreshToken);

    private static bool NeedsRefresh(Integration integration, DateTime refreshBeforeUtc)
    {
        if (!integration.ExpiresAtUtc.HasValue)
        {
            return true;
        }

        return integration.ExpiresAtUtc.Value <= refreshBeforeUtc;
    }

    private ISocialProvider? GetProviderOrDefault(string platform) =>
        _providers.FirstOrDefault(p => string.Equals(p.ProviderId, platform, StringComparison.OrdinalIgnoreCase));

    private static string FormatProviderError(AuthResult result)
    {
        if (result.Error is null)
        {
            return "Token refresh failed.";
        }

        if (string.IsNullOrWhiteSpace(result.Error.Code))
        {
            return string.IsNullOrWhiteSpace(result.Error.Message) ? "Token refresh failed." : result.Error.Message;
        }

        return string.IsNullOrWhiteSpace(result.Error.Message)
            ? result.Error.Code
            : $"{result.Error.Code}: {result.Error.Message}";
    }
}

