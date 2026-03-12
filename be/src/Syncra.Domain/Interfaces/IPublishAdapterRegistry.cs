using Syncra.Domain.Interfaces;

namespace Syncra.Domain.Interfaces;

public interface IPublishAdapterRegistry
{
    IPublishAdapter? GetAdapterOrDefault(string providerId);
}

