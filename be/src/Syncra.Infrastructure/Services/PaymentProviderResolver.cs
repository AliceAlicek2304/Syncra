using Microsoft.Extensions.Options;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;

namespace Syncra.Infrastructure.Services;

public sealed class PaymentProviderResolver : IPaymentProviderResolver
{
    private readonly Dictionary<string, IPaymentProvider> _providers;
    private readonly string _defaultProviderKey;

    public PaymentProviderResolver(
        IEnumerable<IPaymentProvider> providers,
        IOptions<PaymentOptions> paymentOptions)
    {
        _providers = providers.ToDictionary(p => p.ProviderKey.ToLowerInvariant(), p => p);
        _defaultProviderKey = string.IsNullOrWhiteSpace(paymentOptions.Value.DefaultProvider)
            ? "stripe"
            : paymentOptions.Value.DefaultProvider.Trim().ToLowerInvariant();
    }

    public IPaymentProvider GetRequiredProvider(string providerKey)
    {
        var normalizedKey = providerKey.Trim().ToLowerInvariant();
        if (_providers.TryGetValue(normalizedKey, out var provider))
        {
            return provider;
        }

        throw new InvalidOperationException($"Payment provider '{providerKey}' is not registered.");
    }

    public string GetDefaultProviderKey()
    {
        return _defaultProviderKey;
    }
}
