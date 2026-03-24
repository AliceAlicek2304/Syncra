using Hangfire;
using Serilog;
using Syncra.Api;
using Syncra.Api.Logging;
using Syncra.Api.Middleware;
using Syncra.Application;
using Syncra.Infrastructure;
using Syncra.Infrastructure.Jobs;
using Microsoft.Extensions.FileProviders;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration)
        .Enrich.With<RedactingEnricher>());

builder.WebHost.UseSentry();

// Configuration options - bound in module extension methods
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApiServices(builder.Configuration);
builder.Services.AddApiAuthentication(builder.Configuration);
builder.Services.AddHangfireServices(builder.Configuration);

var app = builder.Build();

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
            RequestPath = "/media"
        });
    }
}
catch
{
}

app.UseCors("AllowFrontend");

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

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<TenantResolutionMiddleware>();

app.MapControllers();
app.MapHealthChecks("/health");

// Schedule recurring jobs
using (var scope = app.Services.CreateScope())
{
    var scheduler = scope.ServiceProvider.GetRequiredService<IIntegrationTokenRefreshJobScheduler>();
    scheduler.ScheduleRecurringJob();

    var duePostScheduler = scope.ServiceProvider.GetRequiredService<IDuePostPublishJobScheduler>();
    duePostScheduler.ScheduleRecurringJob();
}

app.Run();