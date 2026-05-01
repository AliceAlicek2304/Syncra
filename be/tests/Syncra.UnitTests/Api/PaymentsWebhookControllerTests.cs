using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Syncra.Api.Middleware;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Infrastructure.Persistence;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using Xunit;
using Syncra.Application.Interfaces;

using Microsoft.Extensions.Configuration;
using Syncra.Application.Options;

namespace Syncra.UnitTests.Api;

public sealed class PaymentsWebhookControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<MediatR.IMediator> _mediatorMock = new();
    private const string WebhookSecret = "whsec_test_secret";

    public PaymentsWebhookControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Stripe:WebhookSecret"] = WebhookSecret,
                    ["Jwt:Secret"] = "super-secret-key-that-is-at-least-32-characters-long",
                    ["Jwt:Issuer"] = "Syncra",
                    ["Jwt:Audience"] = "Syncra"
                });
            });

            builder.ConfigureTestServices(services =>
            {
                // Replace DbContext with In-Memory
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (descriptor != null) services.Remove(descriptor);
                
                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("PaymentsWebhookTestDb");
                });

                services.AddScoped(_ => _mediatorMock.Object);
                services.Configure<StripeOptions>(options =>
                {
                    options.WebhookSecret = WebhookSecret;
                });

                // Mock Hangfire and Schedulers to avoid DB connection issues
                services.AddSingleton(new Mock<Hangfire.IGlobalConfiguration>().Object);
                services.AddSingleton(new Mock<Hangfire.IBackgroundJobClient>().Object);
                services.AddSingleton(new Mock<Hangfire.IRecurringJobManager>().Object);
                services.AddSingleton(new Mock<Hangfire.JobStorage>().Object);

                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IIntegrationTokenRefreshJobScheduler>());
                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IDuePostPublishJobScheduler>());

                // Mock Distributed Lock to avoid Redis dependency
                var lockMock = new Mock<IDistributedLockService>();
                var lockHandleMock = new Mock<IDistributedLock>();
                lockMock.Setup(x => x.TryAcquireAsync(It.IsAny<string>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(lockHandleMock.Object);
                services.AddScoped(_ => lockMock.Object);

                // Mock Authentication
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Test";
                    options.DefaultChallengeScheme = "Test";
                })
                .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, StripeWebhookControllerTests.TestAuthHandler>("Test", options => { });
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
