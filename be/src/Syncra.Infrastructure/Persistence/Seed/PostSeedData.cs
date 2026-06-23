namespace Syncra.Infrastructure.Persistence.Seed;

public static class PostSeedData
{
    // Workspace IDs from WorkspaceSeedData
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

    // Post IDs (fixed for platform targets reference)
    private static readonly Guid Post1Id = Guid.Parse("00000000-0000-0000-0000-000000010001");
    private static readonly Guid Post2Id = Guid.Parse("00000000-0000-0000-0000-000000010002");
    private static readonly Guid Post3Id = Guid.Parse("00000000-0000-0000-0000-000000010003");
    private static readonly Guid Post4Id = Guid.Parse("00000000-0000-0000-0000-000000010004");
    private static readonly Guid Post5Id = Guid.Parse("00000000-0000-0000-0000-000000010005");
    private static readonly Guid Post6Id = Guid.Parse("00000000-0000-0000-0000-000000010006");
    private static readonly Guid Post7Id = Guid.Parse("00000000-0000-0000-0000-000000010007");
    private static readonly Guid Post8Id = Guid.Parse("00000000-0000-0000-0000-000000010008");
    private static readonly Guid Post9Id = Guid.Parse("00000000-0000-0000-0000-000000010009");
    private static readonly Guid Post10Id = Guid.Parse("00000000-0000-0000-0000-000000010010");
    private static readonly Guid Post11Id = Guid.Parse("00000000-0000-0000-0000-000000010011");
    private static readonly Guid Post12Id = Guid.Parse("00000000-0000-0000-0000-000000010012");
    private static readonly Guid Post13Id = Guid.Parse("00000000-0000-0000-0000-000000010013");
    private static readonly Guid Post14Id = Guid.Parse("00000000-0000-0000-0000-000000010014");

    public static string GetInsertPostSql(DateTime now)
    {
        var scheduledTime1 = now.AddDays(1);
        var scheduledTime2 = now.AddDays(2);
        var scheduledTime3 = now.AddDays(3);
        var publishedTime1 = now.AddDays(-1);
        var publishedTime2 = now.AddDays(-2);
        var publishedTime3 = now.AddDays(-3);

        return $@"
            INSERT INTO ""posts"" (""id"", ""workspace_id"", ""user_id"", ""title"", ""content"", ""scheduled_at_utc"", ""published_at_utc"", ""status"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            -- Draft posts
            ('{Post1Id}', '{Workspace1Id}', '{TestUserId}', 'New Product Launch Announcement', 'We are excited to announce our latest product launch! Stay tuned for more details about our innovative solution that will revolutionize the industry.', NULL, NULL, 'Draft', '{now:O}', '{now:O}', 1),
            ('{Post2Id}', '{Workspace1Id}', '{TestUserId}', 'Team Building Event', 'Our team had an amazing time at the annual team building event. Check out some highlights from the day!', NULL, NULL, 'Draft', '{now:O}', '{now:O}', 1),
            ('{Post3Id}', '{Workspace2Id}', '{User2Id}', 'Marketing Tips for 2024', 'Discover the latest marketing trends and strategies that will help your business grow in 2024.', NULL, NULL, 'Draft', '{now:O}', '{now:O}', 1),
            ('{Post4Id}', '{Workspace3Id}', '{User3Id}', 'Design Inspiration Collection', 'A curated collection of design inspiration from around the web. Perfect for creative professionals.', NULL, NULL, 'Draft', '{now:O}', '{now:O}', 1),
            
            -- Scheduled posts
            ('{Post5Id}', '{Workspace1Id}', '{TestUserId}', 'Upcoming Webinar: AI in Business', 'Join us for an exclusive webinar on how AI is transforming business operations. Register now!', '{scheduledTime1:O}', NULL, 'Scheduled', '{now:O}', '{now:O}', 1),
            ('{Post6Id}', '{Workspace2Id}', '{User2Id}', 'Social Media Strategy Guide', 'Learn the best practices for creating an effective social media strategy for your brand.', '{scheduledTime2:O}', NULL, 'Scheduled', '{now:O}', '{now:O}', 1),
            ('{Post7Id}', '{Workspace3Id}', '{User3Id}', 'Color Trends for Spring 2024', 'Explore the hottest color trends for the upcoming spring season. Get inspired!', '{scheduledTime3:O}', NULL, 'Scheduled', '{now:O}', '{now:O}', 1),
            ('{Post8Id}', '{Workspace4Id}', '{User4Id}', 'Flash Sale Announcement', 'Don''t miss our biggest sale of the year! Up to 50% off on selected items.', '{now.AddHours(6):O}', NULL, 'Scheduled', '{now:O}', '{now:O}', 1),
            
            -- Published posts
            ('{Post9Id}', '{Workspace1Id}', '{TestUserId}', 'Company Milestone: 5 Years Strong', 'We are celebrating 5 years of innovation and growth. Thank you to our amazing team and customers!', NULL, '{publishedTime1:O}', 'Published', '{publishedTime1:O}', '{publishedTime1:O}', 1),
            ('{Post10Id}', '{Workspace2Id}', '{User2Id}', 'Client Success Story', 'How we helped our client increase their social media engagement by 300% in just 3 months.', NULL, '{publishedTime2:O}', 'Published', '{publishedTime2:O}', '{publishedTime2:O}', 1),
            ('{Post11Id}', '{Workspace3Id}', '{User3Id}', 'Behind the Scenes: Our Creative Process', 'Take a peek behind the curtain at how our creative team brings ideas to life.', NULL, '{publishedTime3:O}', 'Published', '{publishedTime3:O}', '{publishedTime3:O}', 1),
            ('{Post12Id}', '{Workspace4Id}', '{User4Id}', 'New Product Feature Highlight', 'Introducing our latest feature designed to make your life easier. Learn more about how it works.', NULL, '{now.AddDays(-5):O}', 'Published', '{now.AddDays(-5):O}', '{now.AddDays(-5):O}', 1),
            ('{Post13Id}', '{Workspace5Id}', '{User5Id}', 'Industry Insights: Future of Work', 'Exploring how remote work and digital transformation are shaping the future of business.', NULL, '{now.AddDays(-7):O}', 'Published', '{now.AddDays(-7):O}', '{now.AddDays(-7):O}', 1),
            ('{Post14Id}', '{Workspace6Id}', '{User6Id}', 'Community Impact Update', 'Thanks to our supporters, we''ve reached 1000 families in need this quarter. Here''s the impact.', NULL, '{now.AddDays(-10):O}', 'Published', '{now.AddDays(-10):O}', '{now.AddDays(-10):O}', 1);
        ";
    }

    public static string GetInsertPostPlatformTargetSql(DateTime now)
    {
        return $@"
            INSERT INTO ""post_platform_targets"" (""id"", ""workspace_id"", ""post_id"", ""platform"", ""status"", ""attempt_count"", ""created_at_utc"", ""updated_at_utc"", ""version"")
            VALUES 
            -- Platform targets for published posts
            ('{Guid.NewGuid()}', '{Workspace1Id}', '{Post9Id}', 'twitter', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace1Id}', '{Post9Id}', 'linkedin', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace2Id}', '{Post10Id}', 'facebook', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace2Id}', '{Post10Id}', 'instagram', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace3Id}', '{Post11Id}', 'instagram', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace4Id}', '{Post12Id}', 'twitter', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace4Id}', '{Post12Id}', 'facebook', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace5Id}', '{Post13Id}', 'linkedin', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace6Id}', '{Post14Id}', 'twitter', 'Published', 1, '{now:O}', '{now:O}', 1),
            ('{Guid.NewGuid()}', '{Workspace6Id}', '{Post14Id}', 'facebook', 'Published', 1, '{now:O}', '{now:O}', 1);
        ";
    }
}
