using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Entities;
using Syncra.Domain.Enums;
using Syncra.Domain.Interfaces;

namespace Syncra.Application.Features.Admin.Queries;

public sealed class GetAdminOverviewQueryHandler
    : IRequestHandler<GetAdminOverviewQuery, Result<AdminOverviewDto>>
{
    private readonly IPostRepository _postRepository;
    private readonly ISocialAccountRepository _socialAccountRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ISubscriptionRepository _subscriptionRepository;
    private readonly IUserRepository _userRepository;
    private readonly IUserSessionRepository _userSessionRepository;
    private readonly IPlanRepository _planRepository;
    private readonly IZernioClient _zernioClient;
    private readonly IZernioProfileRepository _zernioProfileRepository;
    private readonly ILogger<GetAdminOverviewQueryHandler> _logger;

    public GetAdminOverviewQueryHandler(
        IPostRepository postRepository,
        ISocialAccountRepository socialAccountRepository,
        IWorkspaceRepository workspaceRepository,
        ISubscriptionRepository subscriptionRepository,
        IUserRepository userRepository,
        IUserSessionRepository userSessionRepository,
        IPlanRepository planRepository,
        IZernioClient zernioClient,
        IZernioProfileRepository zernioProfileRepository,
        ILogger<GetAdminOverviewQueryHandler> logger)
    {
        _postRepository = postRepository;
        _socialAccountRepository = socialAccountRepository;
        _workspaceRepository = workspaceRepository;
        _subscriptionRepository = subscriptionRepository;
        _userRepository = userRepository;
        _userSessionRepository = userSessionRepository;
        _planRepository = planRepository;
        _zernioClient = zernioClient;
        _zernioProfileRepository = zernioProfileRepository;
        _logger = logger;
    }

    public async Task<Result<AdminOverviewDto>> Handle(
        GetAdminOverviewQuery request,
        CancellationToken cancellationToken)
    {
        var overview = new AdminOverviewDto();

        try
        {
            // Get basic metrics from database
            var allWorkspaces = await _workspaceRepository.GetAllAsync(cancellationToken);
            var totalWorkspaces = allWorkspaces.Count();
            
            // Get posts by platform first so we can use the sum as the main metric
            var currentMonthStartEarly = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var twelveMonthsAgoEarly = currentMonthStartEarly.AddMonths(-11);
            Dictionary<string, List<int>> postsByPlatformEarly;
            try
            {
                postsByPlatformEarly = await _postRepository.GetPostsByPlatformMonthlyAsync(
                    twelveMonthsAgoEarly,
                    DateTime.UtcNow,
                    cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get posts by platform for admin overview");
                postsByPlatformEarly = new Dictionary<string, List<int>>();
            }

            // Total published posts = sum of all platform publish counts
            var totalPosts = postsByPlatformEarly.Any()
                ? postsByPlatformEarly.Values.Sum(values => values.Sum())
                : 0;

            // Scheduled posts count - still needs a direct DB count
            var scheduledPosts = 0;
            foreach (var workspace in allWorkspaces)
            {
                var posts = await _postRepository.GetByWorkspaceIdAsync(workspace.Id);
                scheduledPosts += posts.Where(p => p.Status == PostStatus.Scheduled)
                    .Sum(p => p.PlatformTargets.Count > 0 ? p.PlatformTargets.Count : 1);
            }

            // Get social accounts count
            var totalAccounts = 0;
            foreach (var workspace in allWorkspaces)
            {
                var accounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspace.Id);
                totalAccounts += accounts.Count;
            }

            overview.Metrics = new List<OverviewMetricsDto>
            {
                new() { Id = "posts", Title = "Bài viết đã đăng", Value = totalPosts },
                new() { Id = "scheduled", Title = "Bài viết lên lịch", Value = scheduledPosts },
                new() { Id = "accounts", Title = "Tài khoản MXH", Value = totalAccounts },
                new() { Id = "workspaces", Title = "Workspaces", Value = totalWorkspaces }
            };

            if (postsByPlatformEarly.Any())
                overview.PostsByPlatform = postsByPlatformEarly;

            // Get recent activities from posts
            var recentPosts = new List<RecentActivityDto>();
            foreach (var workspace in allWorkspaces.Take(5)) // Limit to first 5 workspaces for performance
            {
                var posts = await _postRepository.GetByWorkspaceIdAsync(workspace.Id);
                var workspaceRecentPosts = posts
                    .OrderByDescending(p => p.UpdatedAtUtc)
                    .Take(5)
                    .Select(p => new RecentActivityDto
                    {
                        Id = p.Id.ToString(),
                        Type = p.Status.ToString(),
                        Status = p.Status.ToString(),
                        When = GetRelativeTime(p.UpdatedAtUtc ?? DateTime.UtcNow),
                        User = "user@example.com", // Would need to load User entity
                        Platform = p.PlatformTargets.FirstOrDefault()?.Platform ?? "unknown"
                    });
                recentPosts.AddRange(workspaceRecentPosts);
            }
            overview.RecentActivities = recentPosts.OrderByDescending(p => p.When).Take(10).ToList();

            // Get top workspaces
            var topWorkspaces = allWorkspaces
                .OrderByDescending(w => w.Members.Count)
                .Take(5)
                .Select(w => new WorkspaceSummaryDto
                {
                    Id = w.Id,
                    Name = w.Name,
                    Slug = w.Slug,
                    MemberCount = w.Members.Count
                })
                .ToList();

            overview.Workspaces = topWorkspaces;

            // Get new accounts in last 24h
            var yesterday = DateTime.UtcNow.AddDays(-1);
            var newAccounts = 0;
            foreach (var workspace in allWorkspaces)
            {
                var accounts = await _socialAccountRepository.GetByWorkspaceIdAsync(workspace.Id);
                newAccounts += accounts.Count(sa => sa.CreatedAtUtc >= yesterday);
            }

            overview.NewAccounts24h = newAccounts;

            // Get revenue by plan from subscriptions
            var allSubscriptions = await _subscriptionRepository.GetAllAsync(cancellationToken);

            var activeSubscriptions = allSubscriptions
                .Where(s => s.Status == Domain.Enums.SubscriptionStatus.Active)
                .ToList();

            // Load plan data separately to avoid navigation property issues
            var planIds = activeSubscriptions.Select(s => s.PlanId).Distinct().ToList();
            var plans = await _planRepository.GetByIdsAsync(planIds, cancellationToken);

            var revenueByPlan = new RevenueByPlanDto
            {
                Free = new List<int>(),
                Pro = new List<int>(),
                Team = new List<int>()
            };

            // Calculate monthly revenue for the last 12 months
            for (int i = 11; i >= 0; i--)
            {
                var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                var monthlyFreeRevenue = 0;
                var monthlyProRevenue = 0;
                var monthlyTeamRevenue = 0;

                foreach (var sub in activeSubscriptions)
                {
                    // Check if subscription was active during this month
                    var wasActiveInMonth = (sub.StartsAtUtc <= monthEnd) &&
                                          (!sub.EndsAtUtc.HasValue || sub.EndsAtUtc.Value >= monthStart);

                    if (wasActiveInMonth)
                    {
                        var plan = plans.FirstOrDefault(p => p.Id == sub.PlanId);
                        var monthlyRevenue = plan?.PriceMonthly ?? 0;
                        if (plan?.Name?.ToLower().Contains("free") == true)
                            monthlyFreeRevenue += (int)monthlyRevenue;
                        else if (plan?.Name?.ToLower().Contains("pro") == true)
                            monthlyProRevenue += (int)monthlyRevenue;
                        else if (plan?.Name?.ToLower().Contains("team") == true)
                            monthlyTeamRevenue += (int)monthlyRevenue;
                    }
                }

                revenueByPlan.Free.Add(monthlyFreeRevenue);
                revenueByPlan.Pro.Add(monthlyProRevenue);
                revenueByPlan.Team.Add(monthlyTeamRevenue);
            }

            overview.RevenueByPlan = revenueByPlan;

            // Get user conversion - using actual data
            var allUsers = await _userRepository.GetAllAsync(cancellationToken);
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            
            var monthlyNewUsers = new List<int>();
            var monthlyActiveUsers = new List<int>();
            var monthlyNonActiveUsers = new List<int>();
            
            for (int i = 11; i >= 0; i--)
            {
                var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                
                // New users in this month
                var newUsersInMonth = allUsers.Count(u => u.CreatedAtUtc >= monthStart && u.CreatedAtUtc <= monthEnd);
                monthlyNewUsers.Add(newUsersInMonth);
                
                // Active users (logged in within last 30 days)
                var activeUsersInMonth = allUsers.Count(u => 
                    u.LastLoginAtUtc.HasValue && 
                    u.LastLoginAtUtc.Value >= thirtyDaysAgo &&
                    u.CreatedAtUtc <= monthEnd);
                monthlyActiveUsers.Add(activeUsersInMonth);
                
                // Non-active users
                var nonActiveUsersInMonth = allUsers.Count(u => 
                    (!u.LastLoginAtUtc.HasValue || u.LastLoginAtUtc.Value < thirtyDaysAgo) &&
                    u.CreatedAtUtc <= monthEnd);
                monthlyNonActiveUsers.Add(nonActiveUsersInMonth);
            }

            overview.UserConversion = new UserConversionDto
            {
                NewUsers = monthlyNewUsers,
                ActiveUsers = monthlyActiveUsers,
                NonActiveUsers = monthlyNonActiveUsers
            };

            // Get recent errors from failed posts
            var recentErrors = new List<ErrorDto>();
            foreach (var workspace in allWorkspaces.Take(5))
            {
                var posts = await _postRepository.GetByWorkspaceIdAsync(workspace.Id);
                var workspaceErrors = posts
                    .Where(p => p.Status == PostStatus.Failed && p.PublishLastError != null)
                    .OrderByDescending(p => p.PublishLastAttemptAtUtc)
                    .Take(5)
                    .Select(p => new ErrorDto
                    {
                        Id = p.Id.ToString(),
                        Level = "error",
                        Message = p.PublishLastError ?? "Unknown error",
                        When = GetRelativeTime(p.PublishLastAttemptAtUtc ?? p.UpdatedAtUtc ?? DateTime.UtcNow),
                    });
                recentErrors.AddRange(workspaceErrors);
            }
            overview.Errors = recentErrors.OrderByDescending(e => e.When).Take(5).ToList();


            // Get post status trends (published, scheduled, failed) from database
            try
            {
                var twelveMonthsAgo = DateTime.UtcNow.AddMonths(-12);
                var allPosts = new List<Post>();
                foreach (var workspace in allWorkspaces)
                {
                    var posts = await _postRepository.GetByWorkspaceIdAsync(workspace.Id);
                    allPosts.AddRange(posts);
                }

                var monthlyPublished = new List<int>();
                var monthlyScheduled = new List<int>();
                var monthlyFailed = new List<int>();

                for (int i = 11; i >= 0; i--)
                {
                    var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
                    var monthEnd = monthStart.AddMonths(1).AddDays(-1);

                    var publishedInMonth = allPosts.Where(p => 
                        p.Status == PostStatus.Published && 
                        p.PublishedAtUtc.HasValue &&
                        p.PublishedAtUtc.Value >= monthStart && 
                        p.PublishedAtUtc.Value <= monthEnd)
                        .Sum(p => p.PlatformTargets.Count > 0 ? p.PlatformTargets.Count : 1);
                    monthlyPublished.Add(publishedInMonth);

                    var scheduledInMonth = allPosts.Where(p => 
                        p.Status == PostStatus.Scheduled && 
                        !p.ScheduledAt.IsNone &&
                        p.ScheduledAt.UtcValue >= monthStart && 
                        p.ScheduledAt.UtcValue <= monthEnd)
                        .Sum(p => p.PlatformTargets.Count > 0 ? p.PlatformTargets.Count : 1);
                    monthlyScheduled.Add(scheduledInMonth);

                    var failedInMonth = allPosts.Where(p => 
                        p.Status == PostStatus.Failed && 
                        p.PublishLastAttemptAtUtc.HasValue &&
                        p.PublishLastAttemptAtUtc.Value >= monthStart && 
                        p.PublishLastAttemptAtUtc.Value <= monthEnd)
                        .Sum(p => p.PlatformTargets.Count > 0 ? p.PlatformTargets.Count : 1);
                    monthlyFailed.Add(failedInMonth);
                }

                overview.EngagementByPlatform = new Dictionary<string, EngagementDto>
                {
                    ["all"] = new EngagementDto
                    {
                        Published = monthlyPublished,
                        Scheduled = monthlyScheduled,
                        Failed = monthlyFailed
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get post status trends for admin overview");
            }

            return Result.Success(overview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting admin overview");
            return Result.Failure<AdminOverviewDto>(ex.Message);
        }
    }

    private static string GetRelativeTime(DateTime dateTime)
    {
        var span = DateTime.UtcNow - dateTime;
        if (span.TotalMinutes < 1) return "vừa xong";
        if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes}m";
        if (span.TotalHours < 24) return $"{(int)span.TotalHours}h";
        if (span.TotalDays < 30) return $"{(int)span.TotalDays}d";
        return dateTime.ToString("yyyy-MM-dd");
    }
}
