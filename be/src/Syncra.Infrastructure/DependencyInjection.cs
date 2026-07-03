
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Persistence.Interceptors;
using Syncra.Infrastructure.Repositories;
using Syncra.Infrastructure.Services;
using Syncra.Domain.Interfaces;
using Syncra.Application.Services;
using Syncra.Application.Options;
using Syncra.Application.Common.Interfaces;
using Syncra.Application.Providers;
using Syncra.Infrastructure.Jobs;
using Syncra.Infrastructure.Storage;
using StackExchange.Redis;
using Syncra.Application.Interfaces;
using IWebScraperService = Syncra.Application.Interfaces.IWebScraperService;

namespace Syncra.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresOptions = configuration.GetSection(PostgresOptions.SectionName).Get<PostgresOptions>() 
            ?? new PostgresOptions();

        services.AddHttpContextAccessor();
        services.AddScoped<AuditInterceptor>();

        // Bind JwtOptions for both IOptions<JwtOptions> (TokenService) and IJwtOptions (Application handlers)
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        services.AddSingleton<IJwtOptions>(jwtOptions);

        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            options.UseNpgsql(postgresOptions.ConnectionString, npgsqlOptions =>
            {
                npgsqlOptions.EnableRetryOnFailure(3);
                npgsqlOptions.CommandTimeout(30);
            });
            options.AddInterceptors(sp.GetRequiredService<AuditInterceptor>());
        });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();
        services.AddScoped<IPostRepository, PostRepository>();
        services.AddScoped<IIdeaRepository, IdeaRepository>();
        services.AddScoped<IGroupRepository, GroupRepository>();
        services.AddScoped<IIntegrationRepository, IntegrationRepository>();
        services.AddScoped<IMediaRepository, MediaRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IBillingPaymentRepository, BillingPaymentRepository>();
        services.AddScoped<IBillingVoucherRepository, BillingVoucherRepository>();
        services.AddScoped<IUserSessionRepository, UserSessionRepository>();
        services.AddScoped<IExternalLoginRepository, ExternalLoginRepository>();
        services.AddScoped<IPlanRepository, PlanRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IPasswordResetTokenRepository, PasswordResetTokenRepository>();
        services.AddScoped<IEmailVerificationTokenRepository, EmailVerificationTokenRepository>();
        services.AddScoped<ISocialAccountRepository, SocialAccountRepository>();
        services.AddScoped<IZernioProfileRepository, ZernioProfileRepository>();
        services.AddScoped<IInboxRepository, InboxRepository>();
        services.AddScoped<IRepurposeRepository, RepurposeRepository>();
        services.AddScoped<IWebScraperService, WebScraperService>();
        services.AddSingleton<Syncra.Application.Interfaces.IInboxCommentListCacheService,
                              Syncra.Infrastructure.Services.InMemoryInboxCommentListCacheService>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<Syncra.Application.Interfaces.ITokenService, Syncra.Infrastructure.Services.TokenService>();

        // Redis distributed cache for analytics query results.
        // Falls back to in-memory cache when no Redis connection string is configured (e.g. local dev).
        var redisOptions = configuration.GetSection(Application.Options.RedisOptions.SectionName)
            .Get<Application.Options.RedisOptions>() ?? new Application.Options.RedisOptions();
        if (!string.IsNullOrWhiteSpace(redisOptions.ConnectionString))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redisOptions.ConnectionString;
                options.InstanceName = "syncra:";
            });
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        // Redis connection multiplexer for distributed locking (webhook concurrency)
        if (!string.IsNullOrWhiteSpace(redisOptions.ConnectionString))
        {
            services.AddSingleton<IConnectionMultiplexer>(sp =>
                ConnectionMultiplexer.Connect(redisOptions.ConnectionString));
        }
        else
        {
            services.AddSingleton<IConnectionMultiplexer?>(sp => null);
        }
        services.AddScoped<IDistributedLockService, RedisDistributedLockService>();

        services.AddScoped<IAnalyticsCache, AnalyticsCacheService>();
        services.AddScoped<IRepurposeCache, RepurposeCacheService>();

        // Wasabi S3-compatible media storage.
        // WasabiStorageService wraps AmazonS3Client which is thread-safe — registered as singleton.
        services.Configure<StorageOptions>(configuration.GetSection(StorageOptions.SectionName));
        services.Configure<WasabiOptions>(configuration.GetSection(WasabiOptions.SectionName));
        services.Configure<MediaOptions>(configuration.GetSection(MediaOptions.SectionName));
        services.AddSingleton<IStorageService, WasabiStorageService>();

        services.Configure<PaymentOptions>(configuration.GetSection(PaymentOptions.SectionName));
        services.Configure<StripeOptions>(configuration.GetSection(StripeOptions.SectionName));
        services.Configure<SePayOptions>(configuration.GetSection(SePayOptions.SectionName));
        services.Configure<AnalyticsOptions>(configuration.GetSection(AnalyticsOptions.SectionName));
        services.AddScoped<IPaymentProvider, StripePaymentProvider>();
        services.AddScoped<IPaymentProvider, SePayPaymentProvider>();
        services.AddScoped<IPaymentProviderResolver, PaymentProviderResolver>();
        services.AddScoped<IStripeService, StripeService>();

        // Google OAuth provider
        services.Configure<GoogleOAuthOptions>(configuration.GetSection("OAuth:Google"));
        services.AddHttpClient("GoogleOAuth", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        services.AddScoped<GoogleAuthProvider>(sp =>
        {
            var httpClient = sp.GetRequiredService<IHttpClientFactory>().CreateClient("GoogleOAuth");
            var options = sp.GetRequiredService<IOptions<GoogleOAuthOptions>>();
            return new GoogleAuthProvider(options, httpClient);
        });
        services.AddScoped<IOAuthProvider, GoogleAuthProvider>();
        services.AddScoped<IGoogleTokenService, GoogleTokenService>();

        // Gemini AI provider
        services.Configure<GeminiOptions>(configuration.GetSection(GeminiOptions.SectionName));
        services.AddScoped<IAIProvider, GeminiProvider>();

        // Web scraper for repurpose URL fetching
        services.AddHttpClient("WebScraper", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
            client.DefaultRequestHeaders.Accept.ParseAdd("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
            client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en-US,en;q=0.9");
        });

        // Postmark transactional email
        services.Configure<PostmarkOptions>(configuration.GetSection(PostmarkOptions.SectionName));
        services.AddHttpClient("PostmarkEmail", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });
        services.AddScoped<IEmailService, PostmarkEmailService>();

        return services;
    }

    public static IServiceCollection AddZernioIntegration(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ZernioOptions>(configuration.GetSection(ZernioOptions.SectionName));
        services.AddScoped<IZernioClient, ZernioClient>();

        services.AddHttpClient("Zernio", (sp, client) =>
        {
            var options = sp.GetRequiredService<IOptions<ZernioOptions>>().Value;
            client.BaseAddress = new Uri("https://api.zernio.com");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", options.ApiKey);
        });

        services.AddScoped<IInboxAnalyticsService, InboxAnalyticsService>();
        services.AddScoped<ProcessZernioWebhookJob>();
        services.AddScoped<CancelScheduledPostsForDisconnectedAccountJob>();
        services.AddScoped<InboxBackfillJob>();
        services.AddHostedService<ZernioWebhookRegistrationService>();
        return services;
    }
}
