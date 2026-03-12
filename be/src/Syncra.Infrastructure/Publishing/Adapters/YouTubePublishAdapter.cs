
using Microsoft.Extensions.Logging;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Models.Social;

namespace Syncra.Infrastructure.Publishing.Adapters;

public sealed class YouTubePublishAdapter : IPublishAdapter
{
    private readonly ILogger<YouTubePublishAdapter> _logger;

    public YouTubePublishAdapter(ILogger<YouTubePublishAdapter> logger)
    {
        _logger = logger;
    }

    public string ProviderId => "youtube";

    public Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("YouTube publishing is not yet supported without media upload functionality.");

        return Task.FromResult(new PublishResult
        {
            IsSuccess = false,
            Error = new ProviderError
            {
                Code = "not_supported",
                Message = "Publishing to YouTube requires media upload, which is not yet implemented.",
                IsTransient = false
            }
        });
    }
}
