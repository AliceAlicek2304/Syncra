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
    private static readonly Guid BasicWorkspaceId = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly Guid ProWorkspaceId = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static readonly Guid TeamWorkspaceId = Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd");

    private static readonly Guid FreePlanId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid ProPlanId = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid TeamPlanId = Guid.Parse("00000000-0000-0000-0000-000000000003");

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
                var newUser = User.Create(seedUser.Email, BC.HashPassword(DefaultPassword));
                newUser.Id = seedUser.Id;
                newUser.Profile = new UserProfile
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
                };

                await db.Users.AddAsync(newUser, cancellationToken);
                continue;
            }

            existingUser.Reactivate();
            existingUser.UpdatePassword(BC.HashPassword(DefaultPassword));

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
            workspace = Workspace.Create(OwnerUserId, "Syncra Dev Team", "syncra-dev-team");
            workspace.Id = WorkspaceId;

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
                var newMember = WorkspaceMember.Create(workspace.Id, seedUser.Id, seedUser.Role.ToString());
                newMember.Id = Guid.NewGuid();
                newMember.Activate();

                await db.WorkspaceMembers.AddAsync(newMember, cancellationToken);
                continue;
            }

            if (existingMember.Role != seedUser.Role && existingMember.Role != WorkspaceMemberRole.Owner)
            {
                existingMember.ChangeRole(seedUser.Role.ToString());
            }

            if (existingMember.Status == WorkspaceMemberStatus.Pending)
            {
                existingMember.Activate();
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        // Seed some common integrations for the development workspace
        var platforms = new[] { "facebook", "instagram", "tiktok", "youtube", "linkedin", "x" };

        foreach (var platform in platforms)
        {
            var existingIntegration = await db.Integrations
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(i => i.WorkspaceId == workspace.Id && i.Platform == platform, cancellationToken);

            if (existingIntegration is null)
            {
                var integration = Integration.Create(workspace.Id, platform);
                integration.Id = Guid.NewGuid();
                await db.Integrations.AddAsync(integration, cancellationToken);
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        var planLimits = new[]
        {
            new { PlanId = FreePlanId, MaxSocialAccounts = 1 },
            new { PlanId = ProPlanId, MaxSocialAccounts = 5 },
            new { PlanId = TeamPlanId, MaxSocialAccounts = 10 },
        };

        foreach (var planLimit in planLimits)
        {
            var plan = await db.Plans
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(p => p.Id == planLimit.PlanId, cancellationToken);

            if (plan is null)
            {
                logger.LogWarning("Plan not found while seeding limits. PlanId={PlanId}", planLimit.PlanId);
                continue;
            }

            if (plan.MaxSocialAccounts != planLimit.MaxSocialAccounts)
            {
                plan.MaxSocialAccounts = planLimit.MaxSocialAccounts;
                plan.UpdatedAtUtc = DateTime.UtcNow;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        var packageWorkspaces = new[]
        {
            new
            {
                Id = BasicWorkspaceId,
                Name = "Syncra Basic Test",
                Slug = "syncra-basic-test",
                OwnerId = OwnerUserId,
                PlanId = FreePlanId
            },
            new
            {
                Id = ProWorkspaceId,
                Name = "Syncra Pro Test",
                Slug = "syncra-pro-test",
                OwnerId = AdminUserId,
                PlanId = ProPlanId
            },
            new
            {
                Id = TeamWorkspaceId,
                Name = "Syncra Team Test",
                Slug = "syncra-team-test",
                OwnerId = MemberUserId,
                PlanId = TeamPlanId
            }
        };

        var utcNow = DateTime.UtcNow;

        foreach (var seeded in packageWorkspaces)
        {
            var seededWorkspace = await db.Workspaces
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(w => w.Id == seeded.Id || w.Slug == seeded.Slug, cancellationToken);

            if (seededWorkspace is null)
            {
                seededWorkspace = Workspace.Create(seeded.OwnerId, seeded.Name, seeded.Slug);
                seededWorkspace.Id = seeded.Id;
                await db.Workspaces.AddAsync(seededWorkspace, cancellationToken);
                await db.SaveChangesAsync(cancellationToken);
            }

            var ownerMember = await db.WorkspaceMembers
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(
                    m => m.WorkspaceId == seededWorkspace.Id && m.UserId == seeded.OwnerId,
                    cancellationToken);

            if (ownerMember is null)
            {
                ownerMember = WorkspaceMember.Create(seededWorkspace.Id, seeded.OwnerId, WorkspaceMemberRole.Owner.ToString());
                ownerMember.Id = Guid.NewGuid();
                ownerMember.Activate();
                await db.WorkspaceMembers.AddAsync(ownerMember, cancellationToken);
            }
            else
            {
                if (ownerMember.Role != WorkspaceMemberRole.Owner)
                {
                    ownerMember.ChangeRole(WorkspaceMemberRole.Owner.ToString());
                }

                if (ownerMember.Status == WorkspaceMemberStatus.Pending)
                {
                    ownerMember.Activate();
                }
            }

            if (seeded.Id == ProWorkspaceId)
            {
                var proTesterMember = await db.WorkspaceMembers
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(
                        m => m.WorkspaceId == seededWorkspace.Id && m.UserId == MemberUserId,
                        cancellationToken);

                if (proTesterMember is null)
                {
                    proTesterMember = WorkspaceMember.Create(
                        seededWorkspace.Id,
                        MemberUserId,
                        WorkspaceMemberRole.Member.ToString());
                    proTesterMember.Id = Guid.NewGuid();
                    proTesterMember.Activate();
                    await db.WorkspaceMembers.AddAsync(proTesterMember, cancellationToken);
                }
                else
                {
                    if (proTesterMember.Role != WorkspaceMemberRole.Member && proTesterMember.Role != WorkspaceMemberRole.Owner)
                    {
                        proTesterMember.ChangeRole(WorkspaceMemberRole.Member.ToString());
                    }

                    if (proTesterMember.Status == WorkspaceMemberStatus.Pending)
                    {
                        proTesterMember.Activate();
                    }
                }
            }

            var subscription = await db.Subscriptions
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(s => s.WorkspaceId == seededWorkspace.Id, cancellationToken);

            if (subscription is null)
            {
                subscription = new Subscription
                {
                    Id = Guid.NewGuid(),
                    WorkspaceId = seededWorkspace.Id,
                    PlanId = seeded.PlanId,
                    Status = SubscriptionStatus.Active,
                    StartsAtUtc = utcNow,
                    CreatedAtUtc = utcNow,
                    Version = 1
                };

                await db.Subscriptions.AddAsync(subscription, cancellationToken);
            }
            else
            {
                if (subscription.IsDeleted)
                {
                    subscription.Restore();
                }

                subscription.PlanId = seeded.PlanId;
                subscription.Status = SubscriptionStatus.Active;
                subscription.StartsAtUtc = utcNow;
                subscription.EndsAtUtc = null;
                subscription.CanceledAtUtc = null;
                subscription.TrialEndsAtUtc = null;
                subscription.UpdatedAtUtc = utcNow;
            }
        }

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded development auth data, integrations, and package test subscriptions. Test accounts: {Emails}. Password: {Password}",
            string.Join(", ", users.Select(u => u.Email)),
            DefaultPassword);
    }

    private sealed record SeedUser(Guid Id, string Email, string FirstName, string LastName, WorkspaceMemberRole Role);
}
