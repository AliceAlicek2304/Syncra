using System;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Syncra.Domain.Entities;
using Syncra.Infrastructure.Persistence;
using Syncra.Infrastructure.Repositories;
using Xunit;

namespace Syncra.UnitTests.Infrastructure;

public class RepurposeConcurrencyTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public RepurposeConcurrencyTests()
    {
        _connection = new SqliteConnection("Filename=:memory:;Foreign Keys=False");
        _connection.Open();

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .LogTo(Console.WriteLine, Microsoft.Extensions.Logging.LogLevel.Information)
            .Options;

        using var context = new AppDbContext(_options);
        context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _connection.Close();
        _connection.Dispose();
    }

    private AppDbContext CreateContext() => new AppDbContext(_options);

    [Fact]
    public async Task SaveChangesAsync_ShouldSucceedOnRepurposeSessionUpdate()
    {
        var workspaceId = Guid.NewGuid();
        using (var context = CreateContext())
        {
            var repo = new RepurposeRepository(context);

            // 1. Add session
            var session = RepurposeSession.Create(
                workspaceId,
                "Source text",
                "default",
                "platform1,platform2");

            await repo.AddSessionAsync(session);
            await repo.SaveChangesAsync();

            // 2. Add atom & mark completed
            var atom = RepurposeAtom.Create(
                session.Id,
                "platform1",
                "POST",
                "Content");
            session.AddAtom(atom);
            context.RepurposeAtoms.Add(atom);
            session.MarkAsCompleted();

            // 3. Save changes
            await repo.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task QueryRealPostgres_PrintLastSessionAndAtoms()
    {
        var connStr = "Host=db.mtavzywyzhsucatheqsp.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=@HieuTai@/DepTrai@;SSL Mode=Require;Trust Server Certificate=true";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(connStr)
            .Options;

        using var context = new AppDbContext(options);
        var lastSession = await context.RepurposeSessions
            .OrderByDescending(s => s.CreatedAtUtc)
            .FirstOrDefaultAsync();

        if (lastSession != null)
        {
            Console.WriteLine($"[DBQUERY] Session Id: {lastSession.Id}");
            Console.WriteLine($"[DBQUERY] Platforms requested: {lastSession.TargetPlatforms}");
            Console.WriteLine($"[DBQUERY] Status: {lastSession.Status}");
            Console.WriteLine($"[DBQUERY] ErrorMessage: {lastSession.ErrorMessage}");

            var atoms = await context.RepurposeAtoms
                .Where(a => a.SessionId == lastSession.Id)
                .ToListAsync();

            Console.WriteLine($"[DBQUERY] Atoms count: {atoms.Count}");
            foreach (var atom in atoms)
            {
                Console.WriteLine($"[DBQUERY] - Platform: {atom.Platform}, Type: {atom.Type}, Content length: {atom.Content.Length}");
            }
        }
        else
        {
            Console.WriteLine("[DBQUERY] No sessions found in PostgreSQL!");
        }
    }
}
