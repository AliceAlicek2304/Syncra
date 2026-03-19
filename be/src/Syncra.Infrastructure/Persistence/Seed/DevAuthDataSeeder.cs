using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Infrastructure.Persistence;
using BC = BCrypt.Net.BCrypt;

namespace Syncra.Infrastructure.Persistence.Seed;

public static class DevAuthDataSeeder
{
    private const string DefaultPassword = "Password123!";

    private static readonly Guid OwnerUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid AdminUserId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid MemberUserId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid ViewerUserId = Guid.Parse("44444444-4444-4444-4444-444444444444");
    private static readonly Guid WorkspaceId = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

    public static async Task SeedAsync(AppDbContext db, ILogger logger, CancellationToken cancellationToken = default)
    {
        var users = new[]
        {
            new SeedUser(OwnerUserId, "owner@syncra.dev", "Workspace", "Owner", WorkspaceMemberRole.Owner),
            new SeedUser(AdminUserId, "admin@syncra.dev", "Team", "Admin", WorkspaceMemberRole.Admin),
            new SeedUser(MemberUserId, "member@syncra.dev", "Content", "Member", WorkspaceMemberRole.Member),
            new SeedUser(ViewerUserId, "viewer@syncra.dev", "Read", "Viewer", WorkspaceMemberRole.Viewer)
        };

        foreach (var seedUser in users)
        {
            var existingUser = await db.Users
                .IgnoreQueryFilters()
                .Include(u => u.Profile)
                .FirstOrDefaultAsync(u => u.Id == seedUser.Id || u.Email == seedUser.Email, cancellationToken);

            if (existingUser is null)
            {
                var newUser = new User
                {
                    Id = seedUser.Id,
                    Email = seedUser.Email,
                    NormalizedEmail = seedUser.Email.ToUpperInvariant(),
                    PasswordHash = BC.HashPassword(DefaultPassword),
                    Status = "active",
                    CreatedAtUtc = DateTime.UtcNow,
                    Version = 1,
                    Profile = new UserProfile
                    {
                        Id = Guid.NewGuid(),
                        UserId = seedUser.Id,
                        FirstName = seedUser.FirstName,
                        LastName = seedUser.LastName,
                        DisplayName = $"{seedUser.FirstName} {seedUser.LastName}",
                        Timezone = "UTC",
                        Locale = "en",
                        CreatedAtUtc = DateTime.UtcNow,
                        Version = 1
                    }
                };

                await db.Users.AddAsync(newUser, cancellationToken);
                continue;
            }

            existingUser.Status = "active";
            existingUser.NormalizedEmail = seedUser.Email.ToUpperInvariant();
            existingUser.PasswordHash = BC.HashPassword(DefaultPassword);

            if (existingUser.Profile is null)
            {
                existingUser.Profile = new UserProfile
                {
                    Id = Guid.NewGuid(),
                    UserId = existingUser.Id,
                    FirstName = seedUser.FirstName,
                    LastName = seedUser.LastName,
                    DisplayName = $"{seedUser.FirstName} {seedUser.LastName}",
                    Timezone = "UTC",
                    Locale = "en",
                    CreatedAtUtc = DateTime.UtcNow,
                    Version = 1
                };
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        var workspace = await db.Workspaces
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(w => w.Id == WorkspaceId || w.Slug == "syncra-dev-team", cancellationToken);

        if (workspace is null)
        {
            workspace = new Workspace
            {
                Id = WorkspaceId,
                Name = "Syncra Dev Team",
                Slug = "syncra-dev-team",
                OwnerUserId = OwnerUserId,
                CreatedAtUtc = DateTime.UtcNow,
                Version = 1
            };

            await db.Workspaces.AddAsync(workspace, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        foreach (var seedUser in users)
        {
            var existingMember = await db.WorkspaceMembers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(
                    m => m.WorkspaceId == workspace.Id && m.UserId == seedUser.Id,
                    cancellationToken);

            if (existingMember is null)
            {
                await db.WorkspaceMembers.AddAsync(new WorkspaceMember
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = workspace.Id,
                    UserId = seedUser.Id,
                    Role = seedUser.Role,
                    Status = WorkspaceMemberStatus.Active,
                    JoinedAtUtc = DateTime.UtcNow,
                    CreatedAtUtc = DateTime.UtcNow,
                    Version = 1
                }, cancellationToken);
                continue;
            }

            existingMember.Role = seedUser.Role;
            existingMember.Status = WorkspaceMemberStatus.Active;
            existingMember.JoinedAtUtc ??= DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded development auth data. Test accounts: {Emails}. Password: {Password}",
            string.Join(", ", users.Select(u => u.Email)),
            DefaultPassword);
    }

    private sealed record SeedUser(Guid Id, string Email, string FirstName, string LastName, WorkspaceMemberRole Role);
}
