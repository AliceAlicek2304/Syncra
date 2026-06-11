// Commented out because it is a developer diagnostic script that relies on local dev connection string and is not a unit test.
/*
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Persistence.Interceptors;
using Xunit;
using Xunit.Abstractions;

namespace Syncra.UnitTests;

public class DbDiagnostics
{
    private readonly ITestOutputHelper _output;

    public DbDiagnostics(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task PrintWorkspacesAndProfiles()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("d:\\Code\\Syncra\\be\\src\\Syncra.Api\\appsettings.Development.json")
            .Build();

        var host = configuration["Postgres:Host"];
        var port = configuration["Postgres:Port"] ?? "5432";
        var database = configuration["Postgres:Database"];
        var username = configuration["Postgres:Username"];
        var password = configuration["Postgres:Password"];
        var useSsl = configuration["Postgres:UseSsl"] != "false";

        var sslPart = useSsl ? ";SSL Mode=Require;Trust Server Certificate=true" : "";
        var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password}{sslPart}";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        using var db = new AppDbContext(optionsBuilder.Options);

        var outputLines = new System.Collections.Generic.List<string>();

        outputLines.Add("--- WORKSPACES ---");
        var workspaces = await db.Workspaces.ToListAsync();
        foreach (var w in workspaces)
        {
            outputLines.Add($"Workspace ID: {w.Id}, Name: {w.Name}, Slug: {w.Slug}");
        }

        outputLines.Add("--- ZERNIO PROFILES ---");
        var profiles = await db.ZernioProfiles.ToListAsync();
        foreach (var p in profiles)
        {
            outputLines.Add($"Profile ID: {p.Id}, ZernioProfileId: {p.ZernioProfileId}, Name: {p.DisplayName}, WorkspaceId: {p.WorkspaceId}, IsActive: {p.IsActive}");
        }

        outputLines.Add("--- SOCIAL ACCOUNTS ---");
        var accounts = await db.SocialAccounts.ToListAsync();
        foreach (var a in accounts)
        {
            outputLines.Add($"Account ID: {a.Id}, ExternalAccountId: {a.ExternalAccountId}, Username: {a.Username}, WorkspaceId: {a.WorkspaceId}, ZernioProfileId: {a.ZernioProfileId}, IsActive: {a.IsActive}");
        }

        await System.IO.File.WriteAllLinesAsync("d:\\Code\\Syncra\\diagnostic_output.txt", outputLines);
    }

    [Fact]
    public async Task TestGetInboxCommentsQuery()
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("d:\\Code\\Syncra\\be\\src\\Syncra.Api\\appsettings.Development.json")
            .Build();

        var services = new Microsoft.Extensions.DependencyInjection.ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging(builder => builder.AddConsole());
        
        // Add infrastructure and Zernio
        services.AddInfrastructureServices(configuration);
        services.AddZernioIntegration(configuration);
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Syncra.Application.Features.Inbox.Queries.GetInboxCommentsQueryHandler).Assembly));

        var sp = services.BuildServiceProvider();
        var mediator = sp.GetRequiredService<MediatR.IMediator>();

        var workspaceId = Guid.Parse("e778ae80-66a6-42af-a885-87eea3d2ccdd");
        
        var outputLines = new System.Collections.Generic.List<string>();
        outputLines.Add($"Testing comments query for workspace {workspaceId}");

        try
        {
            // 1. Query with profileId = "" (All Profiles)
            outputLines.Add("1. Requesting profileId = \"\"");
            var queryAll = new Syncra.Application.Features.Inbox.Queries.GetInboxCommentsQuery(
                WorkspaceId: workspaceId,
                Limit: 100,
                ProfileId: ""
            );
            var resultAll = await mediator.Send(queryAll);
            outputLines.Add($"Result Items Count: {resultAll.Items.Count}");
            foreach (var item in resultAll.Items)
            {
                outputLines.Add($"  Item ID: {item.Id}, Platform: {item.Platform}, Preview: {item.PostPreviewCaption}");
            }
        }
        catch (Exception ex)
        {
            outputLines.Add($"Error query empty profileId: {ex}");
        }

        try
        {
            // 2. Query with specific profile ID
            var profileIdStr = "ea38738d-eea1-4cec-9690-59314a4c7be1";
            outputLines.Add($"2. Requesting profileId = \"{profileIdStr}\"");
            var querySpec = new Syncra.Application.Features.Inbox.Queries.GetInboxCommentsQuery(
                WorkspaceId: workspaceId,
                Limit: 100,
                ProfileId: profileIdStr
            );
            var resultSpec = await mediator.Send(querySpec);
            outputLines.Add($"Result Items Count: {resultSpec.Items.Count}");
            foreach (var item in resultSpec.Items)
            {
                outputLines.Add($"  Item ID: {item.Id}, Platform: {item.Platform}, Preview: {item.PostPreviewCaption}");
            }
        }
        catch (Exception ex)
        {
            outputLines.Add($"Error query specific profileId: {ex}");
        }

        await System.IO.File.WriteAllLinesAsync("d:\\Code\\Syncra\\diagnostic_output.txt", outputLines);
    }
}
*/
