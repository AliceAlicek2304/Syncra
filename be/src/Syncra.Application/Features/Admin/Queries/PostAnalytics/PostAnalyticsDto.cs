namespace Syncra.Application.Features.Admin.Queries.PostAnalytics;

public class PostAnalyticsDto
{
    public IEnumerable<PostMetricDto> Metrics { get; set; } = new List<PostMetricDto>();
    public IEnumerable<PostByStatusDto> PostsByStatus { get; set; } = new List<PostByStatusDto>();
    public IEnumerable<PostByPlatformDto> PostsByPlatform { get; set; } = new List<PostByPlatformDto>();
    public PostTrendsDto Trends { get; set; } = new PostTrendsDto();
    public IEnumerable<TopPosterDto> TopPosters { get; set; } = new List<TopPosterDto>();
}

public class PostMetricDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Growth { get; set; } = string.Empty;
    public string Trend { get; set; } = "up";
}

public class PostByStatusDto
{
    public string Status { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class PostByPlatformDto
{
    public string Platform { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class PostTrendsDto
{
    public IEnumerable<int> MonthlyPosts { get; set; } = new List<int>();
    public IEnumerable<int> PublishedPosts { get; set; } = new List<int>();
    public Dictionary<string, IEnumerable<int>> MonthlyPostsByPlatform { get; set; } = new();
    public Dictionary<string, IEnumerable<int>> PublishedPostsByPlatform { get; set; } = new();
    public int CurrentMonthPosts { get; set; }
    public int PostsGrowth { get; set; }
}

public class TopPosterDto
{
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int PostCount { get; set; }
}
