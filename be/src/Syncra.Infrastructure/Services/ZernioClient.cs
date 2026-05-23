using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Zernio;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Domain.Exceptions;
using Zernio;
using Zernio.Models;

namespace Syncra.Infrastructure.Services;

public sealed class ZernioClient : IZernioClient
{
    private readonly ZernioOptions _options;
    private readonly ZernioSdk _sdk;
    private readonly ILogger<ZernioClient> _logger;

    public ZernioClient(
        IOptions<ZernioOptions> options,
        ILogger<ZernioClient> logger)
    {
        _options = options.Value;
        _sdk = new ZernioSdk(_options.ApiKey);
        _logger = logger;
    }

    public async Task<ZernioConnectUrlResult> GetConnectUrlAsync(
        string profileId,
        string platform,
        string redirectUrl,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var connectUrl = await _sdk.ConnectUrlAsync(
                profileId,
                platform,
                redirectUrl,
                cancellationToken);

            return new ZernioConnectUrlResult(connectUrl);
        }
        catch (ZernioException ex)
        {
            _logger.LogError(ex, "Zernio API error getting connect URL for profile {ProfileId}", profileId);
            throw new DomainException("zernio_connect_error", "Failed to get connect URL from Zernio", ex);
        }
    }

    public async Task<IReadOnlyList<ZernioAccountDto>> ListAccountsAsync(
        string profileId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var accounts = await _sdk.ListAccountsAsync(profileId, cancellationToken);

            return accounts
                .Select(a => new ZernioAccountDto(
                    a.Id,
                    a.Platform,
                    a.DisplayName,
                    a.IsConnected))
                .ToList();
        }
        catch (ZernioException ex)
        {
            _logger.LogError(ex, "Zernio API error listing accounts for profile {ProfileId}", profileId);
            throw new DomainException("zernio_list_accounts_error", "Failed to list Zernio accounts", ex);
        }
    }

    public async Task DisconnectAccountAsync(
        string profileId,
        string accountId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _sdk.DisconnectAccountAsync(profileId, accountId, cancellationToken);
        }
        catch (ZernioException ex)
        {
            _logger.LogError(ex, "Zernio API error disconnecting account {AccountId}", accountId);
            throw new DomainException("zernio_disconnect_error", "Failed to disconnect Zernio account", ex);
        }
    }

    public async Task<ZernioProfileDto> ProvisionProfileAsync(
        string workspaceId,
        string name,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var profile = await _sdk.ProvisionProfileAsync(workspaceId, name, cancellationToken);

            return new ZernioProfileDto(profile.Id, profile.Name);
        }
        catch (ZernioException ex)
        {
            _logger.LogError(ex, "Zernio API error provisioning profile for workspace {WorkspaceId}", workspaceId);
            throw new DomainException("zernio_provision_error", "Failed to provision Zernio profile", ex);
        }
    }
}
