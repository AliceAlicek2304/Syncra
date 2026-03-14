using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;
using Syncra.Domain.Interfaces;

namespace Syncra.Infrastructure.Social;

public sealed class PublishAdapterRegistry : IPublishAdapterRegistry
{
    private readonly IServiceProvider _serviceProvider;

    public PublishAdapterRegistry(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public IPublishAdapter? GetAdapterOrDefault(string providerId)
    {
        var adapters = _serviceProvider.GetServices<IPublishAdapter>();
        return adapters.FirstOrDefault(a =>
            string.Equals(a.ProviderId, providerId, StringComparison.OrdinalIgnoreCase));
    }
}

