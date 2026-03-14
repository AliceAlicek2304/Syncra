using Syncra.Domain.Interfaces;

namespace Syncra.Domain.Interfaces;

public interface IAnalyticsAdapterRegistry
{
    IAnalyticsAdapter? GetAdapterOrDefault(string providerId);
}
