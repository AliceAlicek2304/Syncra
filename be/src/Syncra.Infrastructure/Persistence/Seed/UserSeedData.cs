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

    public static string GetInsertUserSql(DateTime now)
    {
        return $@"
            INSERT INTO ""users"" (""id"", ""email"", ""normalized_email"", ""password_hash"", ""status"", ""email_verified_at_utc"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES ('{TestUserId}', '{TestEmail}', '{TestEmail.ToUpperInvariant()}', '{TestPasswordHash}', 'active', '{now:O}', '{now:O}', '{now:O}', 1);
        ";
    }

    public static string GetInsertUserProfileSql(DateTime now)
    {
        return $@"
            INSERT INTO ""user_profiles"" (""id"", ""user_id"", ""first_name"", ""last_name"", ""display_name"", ""avatar_url"", ""timezone"", ""locale"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES ('{TestProfileId}', '{TestUserId}', 'Test', 'User', 'Test User', NULL, 'Asia/Ho_Chi_Minh', 'en', '{now:O}', '{now:O}', 1);
        ";
    }
}
