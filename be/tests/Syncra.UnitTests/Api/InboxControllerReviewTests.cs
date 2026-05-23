using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Net.Http.Json;
using Hangfire;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Syncra.Application.DTOs.Inbox;
using Syncra.Application.Features.Inbox.Commands;
using Syncra.Application.Features.Inbox.Queries;
using Syncra.Domain.Exceptions;
using Syncra.Infrastructure.Persistence;
using Xunit;

namespace Syncra.UnitTests.Api;

public class InboxControllerReviewTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IMediator> _mediatorMock = new();

    public InboxControllerReviewTests(WebApplicationFactory<Program> factory)
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
                var dbDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
                if (dbDescriptor != null) services.Remove(dbDescriptor);

                services.AddDbContext<AppDbContext>(options =>
                {
                    options.UseInMemoryDatabase("InboxControllerReviewTestDb");
                });

                var cacheDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IDistributedCache));
                if (cacheDescriptor != null) services.Remove(cacheDescriptor);
                services.AddSingleton(new Mock<IDistributedCache>().Object);

                services.AddSingleton(new Mock<IGlobalConfiguration>().Object);
                services.AddSingleton(new Mock<IBackgroundJobClient>().Object);
                services.AddSingleton(new Mock<IRecurringJobManager>().Object);
                services.AddSingleton(new Mock<JobStorage>().Object);

                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IIntegrationTokenRefreshJobScheduler>());
                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IDuePostPublishJobScheduler>());

                // Replace IMediator with mock
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IMediator));
                if (descriptor != null) services.Remove(descriptor);
                services.AddScoped(_ => _mediatorMock.Object);

                // Mock Authentication
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Test";
                    options.DefaultChallengeScheme = "Test";
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });
            });
        });
    }

    private class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var userId = Context.Request.Headers["X-Test-UserId"].ToString();
            if (string.IsNullOrEmpty(userId))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId) };
            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "Test");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    [Fact]
    public async Task GetReviews_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        var reviews = new List<InboxReviewDto>
        {
            new(
                Guid.NewGuid(), "r1", null, "googlebusiness", "John Smith",
                null, 5, "Great service!", false, null,
                null, false, DateTime.UtcNow, DateTime.UtcNow)
        };

        _mediatorMock.Setup(m => m.Send(
            It.Is<GetInboxReviewsQuery>(q => q.WorkspaceId == workspaceId),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(reviews);

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/inbox/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetReviews_Empty_ReturnsOkWithEmptyList()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetInboxReviewsQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InboxReviewDto>());

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/inbox/reviews");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ReplyToReview_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var reviewId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<ReplyToInboxReviewCommand>(q =>
                q.WorkspaceId == workspaceId && q.ReviewId == reviewId),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InboxSendReviewReplyResponse("reply-id-1"));

        var response = await client.PostAsJsonAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/reviews/{reviewId}/reply",
            new InboxSendReviewReplyRequest("Thank you!"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ReplyToReview_BillingRequired_ReturnsForbidden()
    {
        var workspaceId = Guid.NewGuid();
        var reviewId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<ReplyToInboxReviewCommand>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ZernioBillingRequiredException(
                "Inbox add-on is required to reply to reviews.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: null));

        var response = await client.PostAsJsonAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/reviews/{reviewId}/reply",
            new InboxSendReviewReplyRequest("Thank you!"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MarkReviewRead_Success_ReturnsNoContent()
    {
        var workspaceId = Guid.NewGuid();
        var reviewId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<MarkReviewReadCommand>(q =>
                q.WorkspaceId == workspaceId && q.ReviewId == reviewId),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var response = await client.PatchAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/reviews/{reviewId}/read",
            null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task MarkReviewRead_NotFound_ReturnsNotFound()
    {
        var workspaceId = Guid.NewGuid();
        var reviewId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<MarkReviewReadCommand>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var response = await client.PatchAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/reviews/{reviewId}/read",
            null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetReviews_ShouldReturnStarRatingField()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        var reviews = new List<InboxReviewDto>
        {
            new(
                Guid.NewGuid(), "r1", null, "googlebusiness", "John Smith",
                null, 5, "Great!", false, null,
                null, false, DateTime.UtcNow, DateTime.UtcNow)
        };

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetInboxReviewsQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(reviews);

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/inbox/reviews");
        var content = await response.Content.ReadFromJsonAsync<List<InboxReviewDto>>();

        Assert.NotNull(content);
        Assert.Single(content);
        Assert.Equal(5, content![0].StarRating);
    }
}
