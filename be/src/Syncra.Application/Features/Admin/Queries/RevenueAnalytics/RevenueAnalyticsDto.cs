namespace Syncra.Application.Features.Admin.Queries.RevenueAnalytics;

public class RevenueAnalyticsDto
{
    public IEnumerable<RevenueMetricDto> Metrics { get; set; } = new List<RevenueMetricDto>();
    public IEnumerable<PlanUsageDto> PlansByUsage { get; set; } = new List<PlanUsageDto>();
    public RevenueTrendsDto Trends { get; set; } = new RevenueTrendsDto();
    public IEnumerable<PlanGrowthDto> PlanGrowth { get; set; } = new List<PlanGrowthDto>();
    public IEnumerable<WorkspaceSubscriptionDto> WorkspaceSubscriptions { get; set; } = new List<WorkspaceSubscriptionDto>();
}

public class WorkspaceSubscriptionDto
{
    public string WorkspaceId { get; set; } = string.Empty;
    public string WorkspaceName { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? StartedAt { get; set; }
}

public class RevenueMetricDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Growth { get; set; } = string.Empty;
    public string Trend { get; set; } = "up";
}

public class PlanUsageDto
{
    public string PlanName { get; set; } = string.Empty;
    public string PlanCode { get; set; } = string.Empty;
    public int WorkspaceCount { get; set; }
    public decimal MonthlyRevenue { get; set; }
    public double Percentage { get; set; }
}

public class RevenueTrendsDto
{
    public IEnumerable<decimal> MonthlyRevenue { get; set; } = new List<decimal>();
    public IEnumerable<int> NewSubscriptions { get; set; } = new List<int>();
    public decimal CurrentMonthRevenue { get; set; }
    public decimal RevenueGrowth { get; set; }
}

public class PlanGrowthDto
{
    public string PlanName { get; set; } = string.Empty;
    public int CurrentCount { get; set; }
    public int PreviousCount { get; set; }
    public int Growth { get; set; }
}
