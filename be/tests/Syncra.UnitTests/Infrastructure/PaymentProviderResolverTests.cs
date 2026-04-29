using Microsoft.Extensions.Options;
using Syncra.Application.DTOs.Payments;
using Syncra.Application.Interfaces;
using Syncra.Application.Options;
using Syncra.Infrastructure.Services;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public sealed class PaymentProviderResolverTests
{
    [Fact]
    public void Resolving_stripe_returns_registered_provider()
    {
        var stripe = new FakeProvider("stripe");
        var resolver = new PaymentProviderResolver(
            new[] { stripe },
            Options.Create(new PaymentOptions()));

        var resolved = resolver.GetRequiredProvider("stripe");

        Assert.Same(stripe, resolved);
    }

    [Fact]
    public void Provider_keys_are_case_insensitive()
    {
        var stripe = new FakeProvider("stripe");
        var resolver = new PaymentProviderResolver(
            new[] { stripe },
            Options.Create(new PaymentOptions()));

        var resolved = resolver.GetRequiredProvider("StRiPe");

        Assert.Same(stripe, resolved);
    }

    [Fact]
    public void GetDefaultProviderKey_returns_stripe_when_not_overridden()
    {
        var resolver = new PaymentProviderResolver(
            new[] { new FakeProvider("stripe") },
            Options.Create(new PaymentOptions()));

        var defaultProvider = resolver.GetDefaultProviderKey();

        Assert.Equal("stripe", defaultProvider);
    }

    [Fact]
    public void Unknown_provider_throws_with_provider_name()
    {
        var resolver = new PaymentProviderResolver(
            new[] { new FakeProvider("stripe") },
            Options.Create(new PaymentOptions()));

        var ex = Assert.Throws<InvalidOperationException>(() => resolver.GetRequiredProvider("paypal"));

        Assert.Contains("paypal", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class FakeProvider : IPaymentProvider
    {
        public FakeProvider(string providerKey)
        {
            ProviderKey = providerKey;
        }

        public string ProviderKey { get; }

        public Task<PaymentCheckoutSessionResult> CreateCheckoutSessionAsync(
            PaymentCheckoutSessionRequest request,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }

        public Task<PaymentPortalSessionResult> CreatePortalSessionAsync(
            PaymentPortalSessionRequest request,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }

        public Task<PaymentWebhookParseResult> ParseWebhookAsync(
            PaymentWebhookRequest request,
            CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }
    }
}
