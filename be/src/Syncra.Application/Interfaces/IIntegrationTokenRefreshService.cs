using System.Threading;
using System.Threading.Tasks;

namespace Syncra.Application.Interfaces;

public interface IIntegrationTokenRefreshService
{
    Task<RefreshIntegrationTokensResult> RefreshExpiringIntegrationsAsync(CancellationToken cancellationToken = default);
}

