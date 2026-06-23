namespace Syncra.Application.DTOs;

public class AdminOverviewDto
{
    public List<OverviewMetricsDto>? Metrics { get; set; }
    public List<RecentActivityDto>? RecentActivities { get; set; }
    public Dictionary<string, List<int>>? PostsByPlatform { get; set; }
    public Dictionary<string, EngagementDto>? EngagementByPlatform { get; set; }
    public RevenueByPlanDto? RevenueByPlan { get; set; }
    public UserConversionDto? UserConversion { get; set; }
    public List<ErrorDto>? Errors { get; set; }
    public int? NewAccounts24h { get; set; }
    public List<WorkspaceSummaryDto>? Workspaces { get; set; }
}

public class OverviewMetricsDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public object Value { get; set; } = string.Empty;
}

public class RecentActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string When { get; set; } = string.Empty;
    public string User { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
}

public class EngagementDto
{
    public List<int> Published { get; set; } = new();
    public List<int> Scheduled { get; set; } = new();
    public List<int> Failed { get; set; } = new();
}

public class RevenueByPlanDto
{
    public List<int> Free { get; set; } = new();
    public List<int> Pro { get; set; } = new();
    public List<int> Team { get; set; } = new();
}

public class UserConversionDto
{
    public List<int> NewUsers { get; set; } = new();
    public List<int> ActiveUsers { get; set; } = new();
    public List<int> NonActiveUsers { get; set; } = new();
}

public class ErrorDto
{
    public string Id { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string When { get; set; } = string.Empty;
}

public class WorkspaceSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int AccountCount { get; set; }
}
