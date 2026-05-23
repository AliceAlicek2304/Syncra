using Syncra.Application.DTOs.Zernio;

namespace Syncra.Application.Interfaces;

public interface IZernioClient
{
    Task<ZernioConnectUrlResult> GetConnectUrlAsync(
        string profileId,
        string platform,
        string redirectUrl,
        bool? headless = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ZernioAccountDto>> ListAccountsAsync(
        string profileId,
        CancellationToken cancellationToken = default);

    Task DisconnectAccountAsync(
        string profileId,
        string accountId,
        CancellationToken cancellationToken = default);

    Task<ZernioProfileDto> ProvisionProfileAsync(
        string workspaceId,
        string name,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ZernioSelectOptionDto>> ListSelectOptionsAsync(
        string profileId,
        string platform,
        string tempToken,
        CancellationToken cancellationToken = default);

    Task<ZernioSelectResultDto> SelectOptionAsync(
        string profileId,
        string platform,
        string tempToken,
        string selectedId,
        string? selectedName,
        CancellationToken cancellationToken = default);

    Task<ZernioCreatePostResult> CreatePostAsync(
        ZernioCreatePostRequest request,
        CancellationToken cancellationToken = default);

    Task RetryPostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default);

    Task DeletePostAsync(
        string zernioPostId,
        CancellationToken cancellationToken = default);
}
