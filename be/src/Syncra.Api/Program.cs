using Hangfire;
using Serilog;
using Syncra.Api;
using Syncra.Api.Logging;
using Syncra.Api.Middleware;
using Syncra.Api.Hubs;
using Syncra.Application;
using Syncra.Infrastructure;
using Syncra.Infrastructure.Jobs;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
{
    configuration.ReadFrom.Configuration(context.Configuration)
        .Enrich.WithEnvironmentName()
        .Enrich.WithMachineName()
        .Enrich.WithProperty("Application", "Syncra.Api")
        .Enrich.With<RedactingEnricher>();

    foreach (var policy in SensitiveDataDestructuringPolicies.Policies)
    {
        configuration.Destructure.With(policy);
    }
});

builder.WebHost.UseSentry();

// Configuration options - bound in module extension methods
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://syncra.vn", "https://www.syncra.vn")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});
builder.Services.AddApiAuthentication(builder.Configuration);
builder.Services.AddHangfireServices(builder.Configuration);
builder.Services.AddZernioIntegration(builder.Configuration);

var app = builder.Build();

// Register recurring jobs
using (var scope = app.Services.CreateScope())
{
    var recurringJobManager =
        scope.ServiceProvider.GetRequiredService<IRecurringJobManager>();

    recurringJobManager.AddOrUpdate<ZernioSyncJob>(
        "zernio-sync-job",
        job => job.ExecuteAsync(CancellationToken.None),
        "*/15 * * * *");

    recurringJobManager.AddOrUpdate<InboxBackfillV2Job>(
        "inbox-backfill-v2-job",
        job => job.ExecuteAsync(CancellationToken.None),
        "0 * * * *");
}

app.UseStaticFiles();

app.UseMiddleware<RequestBodyRedactionMiddleware>();
app.UseMiddleware<UserIdEnricher>();
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

    app.UseHangfireDashboard("/hangfire");
}

app.UseCors("DevCors");

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<TenantResolutionMiddleware>();
app.UseMiddleware<ProfileResolutionMiddleware>();

app.MapControllers();
app.MapHub<NotificationHub>("/api/v1/hubs/notifications");
app.MapHealthChecks("/health");

// Program entry point
app.Run();
public partial class Program { }
