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

public class InboxControllerCommentsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IMediator> _mediatorMock = new();

    public InboxControllerCommentsTests(WebApplicationFactory<Program> factory)
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
                    options.UseInMemoryDatabase("InboxControllerCommentsTestDb");
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
    public async Task GetComments_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        var comments = new List<InboxCommentDto>
        {
            new(
                Guid.NewGuid(), "c1", null, "instagram", "Alice",
                null, null, "Great post!", "post1", null,
                "Check this out", null, false,
                DateTime.UtcNow, DateTime.UtcNow)
        };

        _mediatorMock.Setup(m => m.Send(
            It.Is<GetInboxCommentsQuery>(q => q.WorkspaceId == workspaceId),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(comments);

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/inbox/comments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetComments_Empty_ReturnsOkWithEmptyList()
    {
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<GetInboxCommentsQuery>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<InboxCommentDto>());

        var response = await client.GetAsync($"/api/v1/workspaces/{workspaceId}/inbox/comments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ReplyToComment_Success_ReturnsOk()
    {
        var workspaceId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<ReplyToInboxCommentCommand>(q =>
                q.WorkspaceId == workspaceId && q.CommentId == commentId),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InboxSendCommentReplyResponse("reply1", "cid1"));

        var response = await client.PostAsJsonAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/comments/{commentId}/reply",
            new InboxSendCommentReplyRequest("Thanks!"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ReplyToComment_BillingRequired_ReturnsForbidden()
    {
        var workspaceId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<ReplyToInboxCommentCommand>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ZernioBillingRequiredException(
                "Inbox add-on is required to reply to comments.",
                reason: "inbox_addon_required",
                dashboardUrl: "https://zernio.com/dashboard/billing",
                details: null));

        var response = await client.PostAsJsonAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/comments/{commentId}/reply",
            new InboxSendCommentReplyRequest("Thanks!"));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MarkCommentRead_Success_ReturnsNoContent()
    {
        var workspaceId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.Is<MarkCommentReadCommand>(q =>
                q.WorkspaceId == workspaceId && q.CommentId == commentId),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var response = await client.PatchAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/comments/{commentId}/read",
            null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task MarkCommentRead_NotFound_ReturnsNotFound()
    {
        var workspaceId = Guid.NewGuid();
        var commentId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        _mediatorMock.Setup(m => m.Send(
            It.IsAny<MarkCommentReadCommand>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var response = await client.PatchAsync(
            $"/api/v1/workspaces/{workspaceId}/inbox/comments/{commentId}/read",
            null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
