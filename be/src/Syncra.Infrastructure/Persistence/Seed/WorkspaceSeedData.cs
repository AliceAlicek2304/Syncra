namespace Syncra.Infrastructure.Persistence.Seed;

public static class WorkspaceSeedData
{
    // Workspace IDs
    private static readonly Guid Workspace1Id = Guid.Parse("00000000-0000-0000-0000-000000000100");
    private static readonly Guid Workspace2Id = Guid.Parse("00000000-0000-0000-0000-000000000200");
    private static readonly Guid Workspace3Id = Guid.Parse("00000000-0000-0000-0000-000000000300");
    private static readonly Guid Workspace4Id = Guid.Parse("00000000-0000-0000-0000-000000000400");
    private static readonly Guid Workspace5Id = Guid.Parse("00000000-0000-0000-0000-000000000500");
    private static readonly Guid Workspace6Id = Guid.Parse("00000000-0000-0000-0000-000000000600");

    // User IDs from UserSeedData
    private static readonly Guid TestUserId = Guid.Parse("00000000-0000-0000-0000-000000000010");
    private static readonly Guid User2Id = Guid.Parse("00000000-0000-0000-0000-000000000020");
    private static readonly Guid User3Id = Guid.Parse("00000000-0000-0000-0000-000000000030");
    private static readonly Guid User4Id = Guid.Parse("00000000-0000-0000-0000-000000000040");
    private static readonly Guid User5Id = Guid.Parse("00000000-0000-0000-0000-000000000050");
    private static readonly Guid User6Id = Guid.Parse("00000000-0000-0000-0000-000000000060");

    public static string GetInsertWorkspaceSql(DateTime now)
    {
        return $@"
            INSERT INTO ""workspaces"" (""id"", ""name"", ""slug"", ""owner_user_id"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            ('{Workspace1Id}', 'Tech Startup', 'tech-startup', '{TestUserId}', '{now:O}', '{now:O}', 1),
            ('{Workspace2Id}', 'Marketing Agency', 'marketing-agency', '{User2Id}', '{now:O}', '{now:O}', 1),
            ('{Workspace3Id}', 'Creative Studio', 'creative-studio', '{User3Id}', '{now:O}', '{now:O}', 1),
            ('{Workspace4Id}', 'E-commerce Store', 'ecommerce-store', '{User4Id}', '{now:O}', '{now:O}', 1),
            ('{Workspace5Id}', 'Personal Brand', 'personal-brand', '{User5Id}', '{now:O}', '{now:O}', 1),
            ('{Workspace6Id}', 'Nonprofit Org', 'nonprofit-org', '{User6Id}', '{now:O}', '{now:O}', 1);
        ";
    }

    public static string GetInsertWorkspaceMemberSql(DateTime now)
    {
        return $@"
            INSERT INTO ""workspace_members"" (""id"", ""workspace_id"", ""user_id"", ""role"", ""status"", ""joined_at_utc"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            -- Workspace 1 members
            ('{Guid.NewGuid()}', '{Workspace1Id}', '{TestUserId}', 'Owner', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace1Id}', '{User2Id}', 'Admin', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace1Id}', '{User3Id}', 'Member', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            
            -- Workspace 2 members
            ('{Guid.NewGuid()}', '{Workspace2Id}', '{User2Id}', 'Owner', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace2Id}', '{User4Id}', 'Admin', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            
            -- Workspace 3 members
            ('{Guid.NewGuid()}', '{Workspace3Id}', '{User3Id}', 'Owner', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace3Id}', '{User5Id}', 'Member', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            
            -- Workspace 4 members
            ('{Guid.NewGuid()}', '{Workspace4Id}', '{User4Id}', 'Owner', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            
            -- Workspace 5 members
            ('{Guid.NewGuid()}', '{Workspace5Id}', '{User5Id}', 'Owner', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace5Id}', '{User6Id}', 'Member', 'Active', '{now:O}', '{now:O}', '{now:O}', 1),
            
            -- Workspace 6 members
            ('{Guid.NewGuid()}', '{Workspace6Id}', '{User6Id}', 'Owner', 'Active', '{now:O}', '{now:O}', '{now:O}', 1)
            ON CONFLICT DO NOTHING;
        ";
    }
}
