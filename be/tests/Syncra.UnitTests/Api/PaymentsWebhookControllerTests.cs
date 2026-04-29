using System.Net;
using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Newtonsoft.Json;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Options;
using Syncra.Infrastructure.Persistence;
using Xunit;

namespace Syncra.UnitTests.Api;

public sealed class PaymentsWebhookControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IMediator> _mediatorMock = new();
    private const string WebhookSecret = "whsec_test_secret";

    public PaymentsWebhookControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Sentry:Dsn"] = "",
                    ["Jwt:Secret"] = "super_secret_test_key_at_least_32_characters_long",
                    ["Jwt:Issuer"] = "Syncra",
                    ["Jwt:Audience"] = "Syncra"
                });
            });

            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("PaymentsWebhookTestDb");
                });

                services.AddScoped(_ => _mediatorMock.Object);
                services.Configure<StripeOptions>(options => options.WebhookSecret = WebhookSecret);

                services.AddSingleton(new Mock<Hangfire.IGlobalConfiguration>().Object);
                services.AddSingleton(new Mock<Hangfire.IBackgroundJobClient>().Object);
                services.AddSingleton(new Mock<Hangfire.IRecurringJobManager>().Object);
                services.AddSingleton(new Mock<Hangfire.JobStorage>().Object);

                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IIntegrationTokenRefreshJobScheduler>());
                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IDuePostPublishJobScheduler>());
            });
        });
    }

    [Fact]
    public async Task Canonical_webhook_route_dispatches_UpdateSubscriptionCommand_once()
    {
        var client = _factory.CreateClient();
        var workspaceId = Guid.NewGuid();
        var subscriptionId = "sub_canonical_123";
        var eventId = "evt_canonical_123";

        var payload = CreateWebhookPayload(eventId, "checkout.session.completed", new
        {
            id = "cs_test_123",
            @object = "checkout.session",
            client_reference_id = workspaceId.ToString(),
            subscription = subscriptionId,
            customer = "cus_123"
        });

        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = GenerateSignature(timestamp, json, WebhookSecret);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/payments/webhook/stripe");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mediatorMock.Verify(m => m.Send(
            It.Is<UpdateSubscriptionCommand>(c => c.Provider == "stripe" && c.ProviderSubscriptionId == subscriptionId),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    private static object CreateWebhookPayload(string id, string type, object dataObject)
    {
        return new
        {
            id,
            @object = "event",
            api_version = "2026-02-25.clover",
            created = 1234567890,
            type,
            livemode = false,
            pending_webhooks = 1,
            request = new { id = "req_123", idempotency_key = "key_123" },
            data = new
            {
                @object = dataObject
            }
        };
    }

    private static string GenerateSignature(string timestamp, string payload, string secret)
    {
        var secretBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes($"{timestamp}.{payload}");
        using var hmac = new HMACSHA256(secretBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
}
