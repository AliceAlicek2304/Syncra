using System.Threading;
using System.Threading.Tasks;
using Syncra.Domain.Models.Social;

namespace Syncra.Domain.Interfaces;

public interface IPublishAdapter
{
    string ProviderId { get; }

    Task<PublishResult> PublishAsync(
        string accessToken,
        PublishRequest request,
        CancellationToken cancellationToken = default);
}

