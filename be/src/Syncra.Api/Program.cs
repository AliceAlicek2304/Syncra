using Hangfire;
using Serilog;
using Syncra.Api;
using Syncra.Api.Logging;
using Syncra.Api.Middleware;
using Syncra.Application;
using Syncra.Infrastructure;
using Syncra.Infrastructure.Jobs;

LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);
var postgresConnectionString = builder.Configuration["Postgres:ConnectionString"];
if (string.IsNullOrWhiteSpace(postgresConnectionString))
{
    postgresConnectionString = "Host=127.0.0.1;Port=5432;Database=syncra_db;Username=postgres;Password=1234567890";
}
var canEnableHangfire = HasConnectionPassword(postgresConnectionString);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration)
        .Enrich.With<RedactingEnricher>());

builder.WebHost.UseSentry();

// Configuration options - bound in module extension methods
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);
builder.Services.AddApiAuthentication(builder.Configuration);
if (canEnableHangfire)
{
    builder.Services.AddHangfireServices(builder.Configuration);
}
else
{
    Console.WriteLine("Hangfire disabled: Postgres:ConnectionString is missing or has no password.");
}

var app = builder.Build();

app.UseStaticFiles();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Syncra API v1");
        c.RoutePrefix = "swagger";
    });

    if (canEnableHangfire)
    {
        app.UseHangfireDashboard("/hangfire");
    }
}

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<TenantResolutionMiddleware>();

app.MapControllers();
app.MapHealthChecks("/health");

// Schedule recurring jobs only when Hangfire is enabled.
if (canEnableHangfire)
{
    using var scope = app.Services.CreateScope();
    var scheduler = scope.ServiceProvider.GetRequiredService<IIntegrationTokenRefreshJobScheduler>();
    scheduler.ScheduleRecurringJob();

    var duePostScheduler = scope.ServiceProvider.GetRequiredService<IDuePostPublishJobScheduler>();
    duePostScheduler.ScheduleRecurringJob();
}

app.Run();

static void LoadDotEnv()
{
    var current = new DirectoryInfo(Directory.GetCurrentDirectory());
    for (var i = 0; i < 8 && current is not null; i++)
    {
        var candidate = Path.Combine(current.FullName, ".env");
        if (File.Exists(candidate))
        {
            foreach (var line in File.ReadAllLines(candidate))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#')) continue;

                var separator = trimmed.IndexOf('=');
                if (separator <= 0) continue;

                var key = trimmed[..separator].Trim();
                var value = trimmed[(separator + 1)..].Trim().Trim('"');
                if (string.IsNullOrWhiteSpace(key)) continue;
                if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
            break;
        }

        current = current.Parent;
    }
}

static bool HasConnectionPassword(string? connectionString)
{
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return false;
    }

    return connectionString.Contains("Password=", StringComparison.OrdinalIgnoreCase);
}
