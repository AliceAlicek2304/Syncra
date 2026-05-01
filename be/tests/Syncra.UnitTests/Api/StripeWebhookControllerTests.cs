using System.Net;
using System.Security.Cryptography;
using System.Text;
using MediatR;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Syncra.Application.Features.Subscriptions.Commands;
using Syncra.Application.Options;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;
using Xunit;

using Syncra.Application.Interfaces;
using Syncra.Api.Controllers;

namespace Syncra.UnitTests.Api;

public class StripeWebhookControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IMediator> _mediatorMock = new();
    private const string WebhookSecret = "whsec_test_secret";

    public StripeWebhookControllerTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Sentry:Dsn"] = "", // Disable Sentry
                    ["Jwt:Secret"] = "super_secret_test_key_at_least_32_characters_long",
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
                    options.UseInMemoryDatabase("StripeWebhookTestDb");
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
                .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });
            });
        });
    }

    public class TestAuthHandler : Microsoft.AspNetCore.Authentication.AuthenticationHandler<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions>
    {
        public TestAuthHandler(IOptionsMonitor<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions> options,
            ILoggerFactory logger, System.Text.Encodings.Web.UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<Microsoft.AspNetCore.Authentication.AuthenticateResult> HandleAuthenticateAsync()
        {
            return Task.FromResult(Microsoft.AspNetCore.Authentication.AuthenticateResult.NoResult());
        }
    }

    [Fact]
    public async Task Index_CheckoutSessionCompleted_SendsUpdateSubscriptionCommand()
    {
        // Arrange
        var client = _factory.CreateClient();
        var workspaceId = Guid.NewGuid();
        var subscriptionId = "sub_123";
        var eventId = "evt_base_123";
        
        var payload = CreateWebhookPayload(eventId, "checkout.session.completed", new
        {
            id = "cs_test_123",
            @object = "checkout.session",
            client_reference_id = workspaceId.ToString(),
            subscription = subscriptionId
        });

        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = GenerateSignature(timestamp, json, WebhookSecret);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        _mediatorMock.Verify(m => m.Send(
            It.Is<UpdateSubscriptionCommand>(c => c.WorkspaceId == workspaceId.ToString() && c.ProviderSubscriptionId == subscriptionId && c.Provider == "stripe"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Index_NewEvent_CreatesIdempotencyRecord()
    {
        // Arrange
        var client = _factory.CreateClient();
        var eventId = "evt_new_123";
        var workspaceId = Guid.NewGuid();
        
        var payload = CreateWebhookPayload(eventId, "checkout.session.completed", new
        {
            id = "cs_test_new",
            @object = "checkout.session",
            client_reference_id = workspaceId.ToString(),
            subscription = "sub_new"
        });
        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = GenerateSignature(timestamp, json, WebhookSecret);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var record = await dbContext.IdempotencyRecords.FirstOrDefaultAsync(r => r.Key == $"stripe_event_{eventId}");
        
        Assert.NotNull(record);
        Assert.Equal(IdempotencyStatus.Success, record.Status);
        Assert.Equal(workspaceId, record.WorkspaceId);
    }

    [Fact]
    public async Task Index_DuplicateEventPending_ProcessesAnyway()
    {
        // Arrange — Pending events are now retried (stale lock scenario)
        var client = _factory.CreateClient();
        var eventId = "evt_pending_123";
        
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.IdempotencyRecords.Add(new IdempotencyRecord
            {
                Key = $"stripe_event_{eventId}",
                RequestHash = eventId,
                Endpoint = "/api/stripe/webhook",
                Method = "POST",
                Status = IdempotencyStatus.Pending,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(30)
            });
            await dbContext.SaveChangesAsync();
        }

        var payload = CreateWebhookPayload(eventId, "checkout.session.completed", new { });
        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = GenerateSignature(timestamp, json, WebhookSecret);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        // Act
        var response = await client.SendAsync(request);

        // Assert — new behavior: pending events are processed (returns 200 OK)
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Index_DuplicateEventSuccess_ReturnsOkWithoutReprocessing()
    {
        // Arrange
        var client = _factory.CreateClient();
        var eventId = "evt_success_123";
        
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.IdempotencyRecords.Add(new IdempotencyRecord
            {
                Key = $"stripe_event_{eventId}",
                RequestHash = eventId,
                Endpoint = "/api/stripe/webhook",
                Method = "POST",
                Status = IdempotencyStatus.Success,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            });
            await dbContext.SaveChangesAsync();
        }

        var payload = CreateWebhookPayload(eventId, "checkout.session.completed", new { });
        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = GenerateSignature(timestamp, json, WebhookSecret);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mediatorMock.Verify(m => m.Send(It.IsAny<UpdateSubscriptionCommand>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Index_DuplicateEventFailure_RetriesProcessing()
    {
        // Arrange
        var client = _factory.CreateClient();
        var eventId = "evt_failure_123";
        var workspaceId = Guid.NewGuid().ToString();
        
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.IdempotencyRecords.Add(new IdempotencyRecord
            {
                Key = $"stripe_event_{eventId}",
                RequestHash = eventId,
                Endpoint = "/api/stripe/webhook",
                Method = "POST",
                Status = IdempotencyStatus.Failure,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            });
            await dbContext.SaveChangesAsync();
        }

        var payload = CreateWebhookPayload(eventId, "checkout.session.completed", new
        {
            id = "cs_test_retry",
            @object = "checkout.session",
            client_reference_id = workspaceId,
            subscription = "sub_123"
        });
        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = GenerateSignature(timestamp, json, WebhookSecret);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mediatorMock.Verify(m => m.Send(
            It.Is<UpdateSubscriptionCommand>(c => c.WorkspaceId == workspaceId && c.Provider == "stripe"), 
            It.IsAny<CancellationToken>()), Times.Once);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var record = await dbContext.IdempotencyRecords.FirstAsync(r => r.Key == $"stripe_event_{eventId}");
            Assert.Equal(IdempotencyStatus.Success, record.Status);
        }
    }

    [Fact]
    public async Task Index_InvalidSignature_ReturnsBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var payload = CreateWebhookPayload("evt_invalid_123", "checkout.session.completed", new { });
        var json = JsonConvert.SerializeObject(payload);
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
        var signature = "invalid_signature";

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("Stripe-Signature", $"t={timestamp},v1={signature}");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Index_MissingSignature_ReturnsBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        var payload = CreateWebhookPayload("evt_missing_123", "checkout.session.completed", new { });
        var json = JsonConvert.SerializeObject(payload);

        var request = new HttpRequestMessage(HttpMethod.Post, "api/stripe/webhook");
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private object CreateWebhookPayload(string id, string type, object dataObject)
    {
        return new
        {
            id = id,
            @object = "event",
            api_version = "2026-02-25.clover",
            created = 1234567890,
            type = type,
            livemode = false,
            pending_webhooks = 1,
            request = new { id = "req_123", idempotency_key = "key_123" },
            data = new
            {
                @object = dataObject
            }
        };
    }

    private string GenerateSignature(string timestamp, string payload, string secret)
    {
        var secretBytes = Encoding.UTF8.GetBytes(secret);
        var payloadBytes = Encoding.UTF8.GetBytes($"{timestamp}.{payload}");
        using var hmac = new HMACSHA256(secretBytes);
        var hash = hmac.ComputeHash(payloadBytes);
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
