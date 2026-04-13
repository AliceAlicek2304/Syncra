using Hangfire;
using Serilog;
using Syncra.Api;
using Syncra.Api.Logging;
using Syncra.Api.Middleware;
using Syncra.Application;
using Syncra.Application.Options;
using Syncra.Infrastructure;
using Syncra.Infrastructure.Jobs;
using Microsoft.Extensions.FileProviders;
using System.IO;

LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);
var postgresOptions = builder.Configuration.GetSection(PostgresOptions.SectionName).Get<PostgresOptions>()
    ?? new PostgresOptions();
var canEnableHangfire = !string.IsNullOrWhiteSpace(postgresOptions.Password);

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
    Console.WriteLine("Hangfire disabled: Postgres password is missing.");
}

var app = builder.Build();

// CORS must run before static files so /media responses include ACAO headers.
app.UseCors("AllowFrontend");

app.UseStaticFiles();

try
{
    var storageSection = app.Configuration.GetSection("Storage");
    var localRoot = storageSection.GetValue<string>("LocalRootPath");
    if (string.IsNullOrWhiteSpace(localRoot)) localRoot = Path.GetTempPath();

    if (Directory.Exists(localRoot))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(localRoot),
            RequestPath = "/media",
            OnPrepareResponse = context =>
            {
                var origin = context.Context.Request.Headers.Origin.ToString();
                if (origin == "http://localhost:5173" || origin == "http://localhost:3000")
                {
                    context.Context.Response.Headers["Access-Control-Allow-Origin"] = origin;
                    context.Context.Response.Headers["Vary"] = "Origin";
                }
            }
        });
    }
}
catch
{
}

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

if (args.Contains("--seed"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<Syncra.Infrastructure.Persistence.AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await Syncra.Infrastructure.Persistence.Seed.DevAuthDataSeeder.SeedAsync(db, logger);
    Console.WriteLine("Database seeding completed.");
    return;
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

