using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Hangfire;
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
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;
using Xunit;

namespace Syncra.UnitTests.Api.Middleware;

public class TenantResolutionMiddlewareTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IDistributedCache> _cacheMock = new();

    public TenantResolutionMiddlewareTests(WebApplicationFactory<Program> factory)
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
                    options.UseInMemoryDatabase("TenantTestDb");
                });

                // Mock IDistributedCache - Ensure we remove existing registration
                var cacheDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IDistributedCache));
                if (cacheDescriptor != null) services.Remove(cacheDescriptor);
                services.AddSingleton(_cacheMock.Object);

                // Mock Hangfire and Schedulers to avoid DB connection issues
                services.AddSingleton(new Mock<IGlobalConfiguration>().Object);
                services.AddSingleton(new Mock<IBackgroundJobClient>().Object);
                services.AddSingleton(new Mock<IRecurringJobManager>().Object);
                services.AddSingleton(new Mock<JobStorage>().Object);
                
                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IIntegrationTokenRefreshJobScheduler>());
                services.AddScoped(_ => Mock.Of<Syncra.Infrastructure.Jobs.IDuePostPublishJobScheduler>());

                // Mock Authentication
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Test";
                    options.DefaultChallengeScheme = "Test";
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });

                services.PostConfigure<Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerOptions>(
                    Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.TokenValidationParameters.IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                        System.Text.Encoding.UTF8.GetBytes("super_secret_test_key_at_least_32_characters_long"));
                });
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
    public async Task Invoke_ValidHeaderAndMembership_ReturnsSuccess()
    {
        // Arrange
        var workspaceId = Guid.Empty;
        var userId = Guid.NewGuid();
        
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = User.Create("test@example.com", "Password123!");
            typeof(EntityBase).GetProperty("Id")?.SetValue(user, userId);
            db.Users.Add(user);
            
            var workspace = Workspace.Create(userId, "Test Workspace", "test-workspace");
            db.Workspaces.Add(workspace);
            await db.SaveChangesAsync();
            workspaceId = workspace.Id;
            
            var member = WorkspaceMember.Create(workspaceId, userId, "Owner");
            member.Activate();
            
            db.WorkspaceMembers.Add(member);
            await db.SaveChangesAsync();
        }

        _cacheMock.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);
        _cacheMock.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Workspace-Id", workspaceId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        // Act
        var response = await client.GetAsync("api/v1/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Invoke_ValidHeaderNoMembership_ReturnsForbidden()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        
        _cacheMock.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);
        _cacheMock.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Workspace-Id", workspaceId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        // Act
        var response = await client.GetAsync("api/v1/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Invoke_MalformedHeader_ReturnsBadRequest()
    {
        // Arrange
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Workspace-Id", "not-a-guid");
        client.DefaultRequestHeaders.Add("X-Test-UserId", Guid.NewGuid().ToString());

        // Act
        var response = await client.GetAsync("api/v1/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Invoke_MissingHeader_PassesThrough()
    {
        // Arrange
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-UserId", Guid.NewGuid().ToString());

        // Act
        var response = await client.GetAsync("api/v1/users/me");

        // Assert
        Assert.NotEqual(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Invoke_ValidMembership_CachesResult()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var cacheKey = $"tenant_cache:{userId}:{workspaceId}";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = User.Create("cache-test@example.com", "Password123!");
            typeof(EntityBase).GetProperty("Id")?.SetValue(user, userId);
            db.Users.Add(user);
            
            var workspace = Workspace.Create(userId, "Cache Workspace", "cache-workspace");
            typeof(EntityBase).GetProperty("Id")?.SetValue(workspace, workspaceId);
            db.Workspaces.Add(workspace);
            
            var member = WorkspaceMember.Create(workspaceId, userId, "Owner");
            member.Activate();
            db.WorkspaceMembers.Add(member);
            await db.SaveChangesAsync();
        }

        _cacheMock.Reset();
        _cacheMock.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);
        _cacheMock.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Workspace-Id", workspaceId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        // Act
        var response = await client.GetAsync("api/v1/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _cacheMock.Verify(x => x.GetAsync(cacheKey, It.IsAny<CancellationToken>()), Times.Once);
        _cacheMock.Verify(x => x.SetAsync(
            cacheKey,
            It.Is<byte[]>(b => System.Text.Encoding.UTF8.GetString(b) == "True"),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Invoke_CacheHit_ReturnsSuccessWithoutDbQuery()
    {
        // Arrange
        var workspaceId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var cacheKey = $"tenant_cache:{userId}:{workspaceId}";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = User.Create("hit-test@example.com", "Password123!");
            typeof(EntityBase).GetProperty("Id")?.SetValue(user, userId);
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        _cacheMock.Reset();
        _cacheMock.Setup(x => x.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(System.Text.Encoding.UTF8.GetBytes("True"));

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Workspace-Id", workspaceId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-UserId", userId.ToString());

        // Act
        var response = await client.GetAsync("api/v1/users/me");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _cacheMock.Verify(x => x.GetAsync(cacheKey, It.IsAny<CancellationToken>()), Times.Once);
        // If it hit the cache, it shouldn't have set it again
        _cacheMock.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }
}
