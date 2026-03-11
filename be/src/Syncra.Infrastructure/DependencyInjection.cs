using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Syncra.Application.Repositories;
using Syncra.Application.Options;

namespace Syncra.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        var postgresOptions = configuration.GetSection(PostgresOptions.SectionName).Get<PostgresOptions>() 
            ?? new PostgresOptions();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(postgresOptions.ConnectionString));

        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IWorkspaceRepository, WorkspaceRepository>();
        services.AddScoped<IPostRepository, PostRepository>();
        services.AddScoped<IIntegrationRepository, IntegrationRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<Syncra.Application.Interfaces.ITokenService, Syncra.Infrastructure.Services.TokenService>();

        return services;
    }
}
