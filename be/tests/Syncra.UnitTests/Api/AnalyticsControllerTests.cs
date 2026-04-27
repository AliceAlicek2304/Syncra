using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
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
using Syncra.Application.DTOs.Analytics;
using Syncra.Application.Features.Analytics.Queries;
using Syncra.Domain.Common;
using Syncra.Domain.Models.Social;
using Syncra.Infrastructure.Persistence;
using Xunit;

namespace Syncra.UnitTests.Api;

public class AnalyticsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IMediator> _mediatorMock = new();

    public AnalyticsControllerTests(WebApplicationFactory<Program> factory)
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
                    options.UseInMemoryDatabase("AnalyticsControllerTestDb");
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
    public async Task GetIntegrationAnalytics_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var integrationId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<GetIntegrationAnalyticsQuery>(q => q.WorkspaceId == workspaceId && q.IntegrationId == integrationId && q.Date == 30),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<AnalyticsData>>.Success(new List<AnalyticsData>()));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/{integrationId}?date=30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetIntegrationAnalytics_Failure_ReturnsBadRequest()
    {
        var workspaceId = Guid.NewGuid();
        var integrationId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetIntegrationAnalyticsQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<AnalyticsData>>.Failure("Integration not found"));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/{integrationId}?date=30");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Integration not found", content);
    }

    [Fact]
    public async Task GetPostAnalytics_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<GetPostAnalyticsQuery>(q => q.WorkspaceId == workspaceId && q.PostId == postId && q.Date == 30),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<AnalyticsData>>.Success(new List<AnalyticsData>()));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/post/{postId}?date=30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetPostAnalytics_Failure_ReturnsBadRequest()
    {
        var workspaceId = Guid.NewGuid();
        var postId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetPostAnalyticsQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<List<AnalyticsData>>.Failure("Post not found"));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/post/{postId}?date=30");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Post not found", content);
    }

    [Fact]
    public async Task GetWorkspaceSummary_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<GetWorkspaceSummaryQuery>(q => q.WorkspaceId == workspaceId && q.Date == 30),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<WorkspaceAnalyticsSummaryDto>.Success(new WorkspaceAnalyticsSummaryDto(0, 0, 0, 0, new List<WeeklyReachDto>())));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/summary?date=30");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetWorkspaceSummary_Failure_ReturnsBadRequest()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetWorkspaceSummaryQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<WorkspaceAnalyticsSummaryDto>.Failure("Failed to load summary"));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/summary?date=30");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Failed to load summary", content);
    }

    [Fact]
    public async Task GetWorkspaceHeatmap_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<GetWorkspaceHeatmapQuery>(q => q.WorkspaceId == workspaceId && q.Date == 90),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<HeatmapDto>.Success(new HeatmapDto(new List<HeatmapSlotDto>())));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/heatmap?date=90");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetWorkspaceHeatmap_Failure_ReturnsBadRequest()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetWorkspaceHeatmapQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<HeatmapDto>.Failure("Failed to load heatmap"));

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/analytics/heatmap?date=90");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Failed to load heatmap", content);
    }
}
