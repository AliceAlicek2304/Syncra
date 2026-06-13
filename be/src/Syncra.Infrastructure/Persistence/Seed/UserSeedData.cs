using BC = BCrypt.Net.BCrypt;

namespace Syncra.Infrastructure.Persistence.Seed;

public static class UserSeedData
{
    // Test user credentials:
    // Email: test@syncra.local
    // Password: Test@12345
    private static readonly Guid TestUserId = Guid.Parse("00000000-0000-0000-0000-000000000010");
    private static readonly Guid TestProfileId = Guid.Parse("00000000-0000-0000-0000-000000000011");
    private static readonly string TestEmail = "test@syncra.local";
    private static readonly string TestPasswordHash = BC.HashPassword("Test@12345");

    // Additional test users
    private static readonly Guid User2Id = Guid.Parse("00000000-0000-0000-0000-000000000020");
    private static readonly Guid User2ProfileId = Guid.Parse("00000000-0000-0000-0000-000000000021");
    private static readonly string User2Email = "user2@syncra.local";
    private static readonly string User2PasswordHash = BC.HashPassword("Test@12345");

    private static readonly Guid User3Id = Guid.Parse("00000000-0000-0000-0000-000000000030");
    private static readonly Guid User3ProfileId = Guid.Parse("00000000-0000-0000-0000-000000000031");
    private static readonly string User3Email = "user3@syncra.local";
    private static readonly string User3PasswordHash = BC.HashPassword("Test@12345");

    private static readonly Guid User4Id = Guid.Parse("00000000-0000-0000-0000-000000000040");
    private static readonly Guid User4ProfileId = Guid.Parse("00000000-0000-0000-0000-000000000041");
    private static readonly string User4Email = "user4@syncra.local";
    private static readonly string User4PasswordHash = BC.HashPassword("Test@12345");

    private static readonly Guid User5Id = Guid.Parse("00000000-0000-0000-0000-000000000050");
    private static readonly Guid User5ProfileId = Guid.Parse("00000000-0000-0000-0000-000000000051");
    private static readonly string User5Email = "user5@syncra.local";
    private static readonly string User5PasswordHash = BC.HashPassword("Test@12345");

    private static readonly Guid User6Id = Guid.Parse("00000000-0000-0000-0000-000000000060");
    private static readonly Guid User6ProfileId = Guid.Parse("00000000-0000-0000-0000-000000000061");
    private static readonly string User6Email = "user6@syncra.local";
    private static readonly string User6PasswordHash = BC.HashPassword("Test@12345");

    public static string GetInsertUserSql(DateTime now)
    {
        return $@"
            INSERT INTO ""users"" (""id"", ""email"", ""normalized_email"", ""password_hash"", ""status"", ""email_verified_at_utc"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            ('{TestUserId}', '{TestEmail}', '{TestEmail.ToUpperInvariant()}', '{TestPasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{User2Id}', '{User2Email}', '{User2Email.ToUpperInvariant()}', '{User2PasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{User3Id}', '{User3Email}', '{User3Email.ToUpperInvariant()}', '{User3PasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{User4Id}', '{User4Email}', '{User4Email.ToUpperInvariant()}', '{User4PasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{User5Id}', '{User5Email}', '{User5Email.ToUpperInvariant()}', '{User5PasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1),
            ('{User6Id}', '{User6Email}', '{User6Email.ToUpperInvariant()}', '{User6PasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1);
        ";
    }

    public static string GetInsertUserProfileSql(DateTime now)
    {
        return $@"
            INSERT INTO ""user_profiles"" (""id"", ""user_id"", ""first_name"", ""last_name"", ""display_name"", ""avatar_url"", ""timezone"", ""locale"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            ('{TestProfileId}', '{TestUserId}', 'Test', 'User', 'Test User', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1),
            ('{User2ProfileId}', '{User2Id}', 'John', 'Doe', 'John Doe', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1),
            ('{User3ProfileId}', '{User3Id}', 'Jane', 'Smith', 'Jane Smith', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1),
            ('{User4ProfileId}', '{User4Id}', 'Mike', 'Johnson', 'Mike Johnson', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1),
            ('{User5ProfileId}', '{User5Id}', 'Sarah', 'Williams', 'Sarah Williams', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1),
            ('{User6ProfileId}', '{User6Id}', 'David', 'Brown', 'David Brown', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1);
        ";
    }
}
