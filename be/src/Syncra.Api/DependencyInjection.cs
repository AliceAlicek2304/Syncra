    using Microsoft.AspNetCore.Authentication.JwtBearer;
    using Microsoft.IdentityModel.Tokens;
    using Microsoft.OpenApi.Models;
    using System.Text;
    using Hangfire;
    using Hangfire.PostgreSql;
    using Syncra.Application.Options;
    using Syncra.Infrastructure.Persistence;
    using Syncra.Api.Filters;
    using System.Security.Claims;
    using Microsoft.EntityFrameworkCore;

    namespace Syncra.Api;

    public static class DependencyInjection
    {
        public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Controllers
            services.AddControllers();
            services.AddSignalR();
            services.AddEndpointsApiExplorer();
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new() { Title = "Syncra API", Version = "v1" });

                // Add JWT Authentication support
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Chỉ cần dán Token vào đây (Hệ thống sẽ tự thêm tiền tố Bearer)"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });

                // Add X-Workspace-Id and X-Profile-Id support to all endpoints
                c.OperationFilter<SwaggerFilters.WorkspaceHeaderFilter>();
                c.OperationFilter<SwaggerFilters.ProfileHeaderFilter>();
                
                // Add Idempotency-Key support for mutating endpoints
                c.OperationFilter<SwaggerFilters.IdempotencyHeaderFilter>();
            });

            // Health checks
            services.AddHealthChecks()
                .AddDbContextCheck<AppDbContext>("database");

            // Filters
            services.AddScoped<Filters.IdempotencyFilter>();
            services.AddScoped<Filters.ZernioWebhookSignatureFilter>();
            services.AddScoped<Filters.RepurposePlanLimitFilter>();
            services.AddScoped<Controllers.PaymentWebhookOrchestrator>();
            services.AddScoped<Syncra.Application.Interfaces.INotificationDispatcher, Syncra.Api.Services.NotificationDispatcher>();
            services.AddScoped<Syncra.Application.Interfaces.IPostStatusNotifier, Syncra.Api.Services.PostStatusNotifier>();
            services.AddScoped<Syncra.Application.Interfaces.IInboxNotifier, Syncra.Api.Services.InboxNotifier>();

            return services;
        }

        public static IServiceCollection AddApiAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var jwtOptions = new JwtOptions();
            configuration.GetSection(JwtOptions.SectionName).Bind(jwtOptions);

            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = !string.IsNullOrEmpty(jwtOptions.Secret) 
                        ? new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret))
                        : null
                };
                
                if (options.TokenValidationParameters.IssuerSigningKey == null)
                {
                    options.TokenValidationParameters.ValidateIssuerSigningKey = false;
                }

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        var path = context.HttpContext.Request.Path;

                        if (!string.IsNullOrEmpty(accessToken) &&
                            path.StartsWithSegments("/api/v1/hubs/notifications"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = async context =>
                    {
                        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                        try
                        {
                            var userIdClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                            var securityStampClaim = context.Principal?.FindFirstValue("security_stamp");

                            if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(securityStampClaim))
                            {
                                logger.LogWarning("Token validation failed: Missing claims. UserId: {UserId}, SecurityStamp: {SecurityStamp}", 
                                    userIdClaim ?? "null", securityStampClaim ?? "null");
                                context.Fail("Invalid token — missing required claims.");
                                return;
                            }

                            var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                            var user = await dbContext.Users.FindAsync(Guid.Parse(userIdClaim));

                            if (user == null)
                            {
                                logger.LogWarning("Token validation failed: User {UserId} not found in database", userIdClaim);
                                context.Fail("Authentication failed — user not found.");
                                return;
                            }

                            if (user.SecurityStamp != securityStampClaim)
                            {
                                logger.LogWarning("Token validation failed: SecurityStamp mismatch for user {UserId}. DB: {DbStamp}, Token: {TokenStamp}", 
                                    userIdClaim, user.SecurityStamp, securityStampClaim);
                                context.Fail("Authentication failed — token has been invalidated.");
                                return;
                            }
                            
                            logger.LogDebug("Token validated successfully for user {UserId}", userIdClaim);
                        }
                        catch (Exception ex)
                        {
                            logger.LogError(ex, "Error during token validation for user {UserIdClaim}", 
                                context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown");
                            context.Fail("Authentication failed.");
                        }
                    },
                    OnAuthenticationFailed = context =>
                    {
                        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                        logger.LogWarning(context.Exception, "JWT Authentication failed: {Message}", context.Exception.Message);
                        return Task.CompletedTask;
                    }
                };
            });

            services.AddAuthorization();

            return services;
        }

        public static IServiceCollection AddHangfireServices(this IServiceCollection services, IConfiguration configuration)
        {
            var postgresOptions = new PostgresOptions();
            configuration.GetSection(PostgresOptions.SectionName).Bind(postgresOptions);

            services.AddHangfire(hangfireConfig =>
            {
                hangfireConfig
                    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
                    .UseSimpleAssemblyNameTypeSerializer()
                    .UseRecommendedSerializerSettings()
                    .UsePostgreSqlStorage(options =>
                    {
                        options.UseNpgsqlConnection(postgresOptions.ConnectionString);
                    });
            });

            services.AddHangfireServer();

            return services;
        }
    }