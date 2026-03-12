
using Microsoft.Extensions.Logging;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing.Adapters;

public sealed class TikTokPublishAdapter : IPublishAdapter
{
    private readonly ILogger<TikTokPublishAdapter> _logger;

    public TikTokPublishAdapter(ILogger<TikTokPublishAdapter> logger)
    {
        _logger = logger;
    }

    public string ProviderId => "tiktok";

    public Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("TikTok publishing is not yet supported without media upload functionality.");

        return Task.FromResult(new PublishResult
        {
            IsSuccess = false,
            Error = new ProviderError
            {
                Code = "not_supported",
                Message = "Publishing to TikTok requires media upload, which is not yet implemented.",
                IsTransient = false
            }
        });
    }
}
