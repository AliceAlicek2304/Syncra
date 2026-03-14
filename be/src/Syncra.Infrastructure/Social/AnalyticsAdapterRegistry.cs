using System;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public sealed class AnalyticsAdapterRegistry : IAnalyticsAdapterRegistry
{
    private readonly IServiceProvider _serviceProvider;

    public AnalyticsAdapterRegistry(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public IAnalyticsAdapter? GetAdapterOrDefault(string providerId)
    {
        var adapters = _serviceProvider.GetServices<IAnalyticsAdapter>();
        return adapters.FirstOrDefault(a =>
            string.Equals(a.ProviderId, providerId, StringComparison.OrdinalIgnoreCase));
    }
}
