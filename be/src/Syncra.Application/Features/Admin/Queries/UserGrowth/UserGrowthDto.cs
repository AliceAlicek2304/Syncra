using Syncra.Application.DTOs;

namespace Syncra.Application.Features.Admin.Queries.UserGrowth;

public class UserGrowthDto
{
    public IEnumerable<UserGrowthMetricDto> Metrics { get; set; } = new List<UserGrowthMetricDto>();
    public UserActivityTrendsDto ActivityTrends { get; set; } = new UserActivityTrendsDto();
    public IEnumerable<PlatformRadarDto> PlatformRadar { get; set; } = new List<PlatformRadarDto>();
    public IEnumerable<int> ActivityDistribution { get; set; } = new List<int>();
    public IEnumerable<RecentUserDto> RecentUsers { get; set; } = new List<RecentUserDto>();
    public RetentionChurnDto RetentionChurn { get; set; } = new RetentionChurnDto();
    public IEnumerable<PlanChangeDto> RecentPlanChanges { get; set; } = new List<PlanChangeDto>();
    public WorkspaceStatisticsDto WorkspaceStatistics { get; set; } = new WorkspaceStatisticsDto();
    public SocialAccountTrendsDto SocialAccountTrends { get; set; } = new SocialAccountTrendsDto();
}

public class UserGrowthMetricDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Growth { get; set; } = string.Empty;
    public string Trend { get; set; } = "up";
}

public class UserActivityTrendsDto
{
    public IEnumerable<int> NewUsers { get; set; } = new List<int>();
    public IEnumerable<int> ActiveUsers { get; set; } = new List<int>();
    public int CurrentActiveUsers { get; set; }
    public int ActiveUsersGrowth { get; set; }
    public int CurrentNewUsers { get; set; }
    public int NewUsersGrowth { get; set; }
}

public class PlatformRadarDto
{
    public string Label { get; set; } = string.Empty;
    public double Value { get; set; }
}

public class RecentUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Plan { get; set; } = "Starter";
    public string Joined { get; set; } = string.Empty;
    public string Active { get; set; } = string.Empty;
}

public class RetentionChurnDto
{
    public double RetentionRate { get; set; }
    public double ChurnRate { get; set; }
    public IEnumerable<int> ChurnTrend { get; set; } = new List<int>();
}

public class PlanChangeDto
{
    public string User { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
}

public class WorkspaceStatisticsDto
{
    public int TotalWorkspaces { get; set; }
    public int ActiveWorkspaces { get; set; }
    public double AvgAccountsPerWorkspace { get; set; }
    public IEnumerable<WorkspaceSummaryDto> TopWorkspaces { get; set; } = new List<WorkspaceSummaryDto>();
}

public class SocialAccountTrendsDto
{
    public IEnumerable<int> MonthlyAccounts { get; set; } = new List<int>();
    public Dictionary<string, IEnumerable<int>> AccountsByPlatformMonthly { get; set; } = new();
}
