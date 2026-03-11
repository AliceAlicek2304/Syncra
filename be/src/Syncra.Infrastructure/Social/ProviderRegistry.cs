using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public interface IProviderRegistry
{
    ISocialProvider GetProvider(string providerId);
}

public class ProviderRegistry : IProviderRegistry
{
    private readonly IServiceProvider _serviceProvider;

    public ProviderRegistry(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public ISocialProvider GetProvider(string providerId)
    {
        var providers = _serviceProvider.GetServices<ISocialProvider>();
        var provider = providers.FirstOrDefault(p => string.Equals(p.ProviderId, providerId, StringComparison.OrdinalIgnoreCase));
        
        if (provider == null)
        {
            throw new KeyNotFoundException($"Social provider '{providerId}' is not registered.");
        }

        return provider;
    }
}
