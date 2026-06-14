using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Enums;

namespace Syncra.Application.Features.Admin.Queries.RevenueAnalytics;

public sealed class GetRevenueAnalyticsQueryHandler
    : IRequestHandler<GetRevenueAnalyticsQuery, Result<RevenueAnalyticsDto>>
{
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ILogger<GetRevenueAnalyticsQueryHandler> _logger;

    public GetRevenueAnalyticsQueryHandler(
        ISubscriptionRepository subscriptionRepository,
        IPlanRepository planRepository,
        IWorkspaceRepository workspaceRepository,
        ILogger<GetRevenueAnalyticsQueryHandler> logger)
    {
        _subscriptionRepository = subscriptionRepository;
        _planRepository = planRepository;
        _workspaceRepository = workspaceRepository;
        _logger = logger;
    }

    public async Task<Result<RevenueAnalyticsDto>> Handle(
        GetRevenueAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        var dto = new RevenueAnalyticsDto();

        try
        {
            var allSubscriptions = await _subscriptionRepository.GetAllAsync(cancellationToken);
            var allWorkspaces = await _workspaceRepository.GetAllAsync(cancellationToken);

            // Load plan data separately to avoid timeout
            var planIds = allSubscriptions.Select(s => s.PlanId).Distinct().ToList();
            var plans = await _planRepository.GetByIdsAsync(planIds, cancellationToken);

            var activeSubscriptions = allSubscriptions.Where(s => s.Status == SubscriptionStatus.Active).ToList();
            var totalWorkspaces = allWorkspaces.Count();
            var totalSubscriptions = allSubscriptions.Count();
            var activeSubscriptionsCount = activeSubscriptions.Count;

            // Calculate total monthly revenue
            var totalMonthlyRevenue = activeSubscriptions.Sum(s => {
                var plan = plans.FirstOrDefault(p => p.Id == s.PlanId);
                return plan?.PriceMonthly ?? 0m;
            });

            // Calculate current month new subscriptions
            var currentMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var newSubscriptionsThisMonth = allSubscriptions.Count(s => s.StartsAtUtc >= currentMonthStart);

            dto.Metrics = new List<RevenueMetricDto>
            {
                new() { Id = "revenue", Title = "Doanh thu hàng tháng", Value = $"${totalMonthlyRevenue:N0}", Growth = "+0", Trend = "up" },
                new() { Id = "subscriptions", Title = "Tổng subscription", Value = totalSubscriptions.ToString("N0"), Growth = "+0", Trend = "up" },
                new() { Id = "active", Title = "Subscription active", Value = activeSubscriptionsCount.ToString("N0"), Growth = "+0", Trend = "up" },
                new() { Id = "workspaces", Title = "Workspace đang dùng", Value = totalWorkspaces.ToString("N0"), Growth = "+0", Trend = "up" }
            };

            // Plans by usage
            var planUsage = activeSubscriptions
                .GroupBy(s => s.PlanId)
                .Select(g => new
                {
                    PlanId = g.Key,
                    Count = g.Count(),
                    Revenue = g.Sum(s => {
                        var plan = plans.FirstOrDefault(p => p.Id == s.PlanId);
                        return plan?.PriceMonthly ?? 0m;
                    })
                })
                .ToList();

            var plansByUsage = new List<PlanUsageDto>();
            foreach (var item in planUsage)
            {
                var plan = plans.FirstOrDefault(p => p.Id == item.PlanId);
                if (plan != null)
                {
                    plansByUsage.Add(new PlanUsageDto
                    {
                        PlanName = plan.Name,
                        PlanCode = plan.Code,
                        WorkspaceCount = item.Count,
                        MonthlyRevenue = item.Revenue,
                        Percentage = activeSubscriptionsCount > 0 ? Math.Round((double)item.Count / activeSubscriptionsCount * 100, 1) : 0
                    });
                }
            }
            dto.PlansByUsage = plansByUsage.OrderByDescending(p => p.WorkspaceCount).ToList();

            // Monthly trends
            var monthlyRevenue = new List<decimal>();
            var monthlyNewSubs = new List<int>();
            
            for (int i = 11; i >= 0; i--)
            {
                var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                
                // Revenue for this month (from active subscriptions at end of month)
                var activeInMonth = allSubscriptions.Where(s => 
                    s.StartsAtUtc <= monthEnd && 
                    (!s.EndsAtUtc.HasValue || s.EndsAtUtc.Value > monthStart) &&
                    s.Status == SubscriptionStatus.Active).ToList();
                var revenueInMonth = activeInMonth.Sum(s => {
                    var plan = plans.FirstOrDefault(p => p.Id == s.PlanId);
                    return plan?.PriceMonthly ?? 0m;
                });
                monthlyRevenue.Add(revenueInMonth);
                
                // New subscriptions in this month
                var newSubsInMonth = allSubscriptions.Count(s => s.StartsAtUtc >= monthStart && s.StartsAtUtc <= monthEnd);
                monthlyNewSubs.Add(newSubsInMonth);
            }

            var currentMonthRevenue = monthlyRevenue.LastOrDefault();
            var previousMonthRevenue = monthlyRevenue.Count > 1 ? monthlyRevenue[monthlyRevenue.Count - 2] : 0m;
            var revenueGrowth = currentMonthRevenue - previousMonthRevenue;

            dto.Trends = new RevenueTrendsDto
            {
                MonthlyRevenue = monthlyRevenue,
                NewSubscriptions = monthlyNewSubs,
                CurrentMonthRevenue = currentMonthRevenue,
                RevenueGrowth = revenueGrowth
            };

            // Plan growth
            var previousMonthStart = currentMonthStart.AddMonths(-1);
            
            // Get unique plans from subscriptions
            var uniquePlans = plans.Where(p => p.IsActive).ToList();
            
            var planGrowth = new List<PlanGrowthDto>();
            foreach (var plan in uniquePlans)
            {
                var currentCount = activeSubscriptions.Count(s => s.PlanId == plan.Id);
                var previousCount = allSubscriptions.Count(s => 
                    s.PlanId == plan.Id && 
                    s.StartsAtUtc >= previousMonthStart && 
                    s.StartsAtUtc < currentMonthStart);
                var growth = currentCount - previousCount;
                
                planGrowth.Add(new PlanGrowthDto
                {
                    PlanName = plan.Name,
                    CurrentCount = currentCount,
                    PreviousCount = previousCount,
                    Growth = growth
                });
            }
            dto.PlanGrowth = planGrowth.OrderByDescending(p => p.Growth).ToList();

            // Workspace subscriptions
            var workspaceSubscriptions = new List<WorkspaceSubscriptionDto>();
            foreach (var workspace in allWorkspaces)
            {
                var subscription = allSubscriptions.FirstOrDefault(s => s.WorkspaceId == workspace.Id);
                var plan = subscription != null ? plans.FirstOrDefault(p => p.Id == subscription.PlanId) : null;
                workspaceSubscriptions.Add(new WorkspaceSubscriptionDto
                {
                    WorkspaceId = workspace.Id.ToString(),
                    WorkspaceName = workspace.Name,
                    PlanName = plan?.Name ?? "No Plan",
                    Status = subscription?.Status.ToString() ?? "None",
                    StartedAt = subscription?.StartsAtUtc
                });
            }
            dto.WorkspaceSubscriptions = workspaceSubscriptions;

            return Result.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting revenue analytics data");
            return Result.Failure<RevenueAnalyticsDto>(ex.Message);
        }
    }
}
