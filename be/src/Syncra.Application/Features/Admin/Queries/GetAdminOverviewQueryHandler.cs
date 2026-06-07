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
            
            // Get posts count - need to sum from all workspaces
            var totalPosts = 0;
            var scheduledPosts = 0;
            foreach (var workspace in allWorkspaces)
            {
                var posts = await _postRepository.GetByWorkspaceIdAsync(workspace.Id);
                totalPosts += posts.Count();
                scheduledPosts += posts.Count(p => p.Status == PostStatus.Scheduled);
            }

            // Get social accounts count - need to sum from all workspaces
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
            var allSubscriptions = new List<Subscription>();
            foreach (var workspace in allWorkspaces)
            {
                var sub = await _subscriptionRepository.GetByWorkspaceIdAsync(workspace.Id);
                if (sub != null)
                    allSubscriptions.Add(sub);
            }
            
            var activeSubscriptions = allSubscriptions
                .Where(s => s.Status == Domain.Enums.SubscriptionStatus.Active)
                .ToList();

            var revenueByPlan = new RevenueByPlanDto
            {
                Starter = Enumerable.Repeat(0, 12).ToList(),
                Pro = Enumerable.Repeat(0, 12).ToList(),
                Enterprise = Enumerable.Repeat(0, 12).ToList()
            };

            foreach (var sub in activeSubscriptions)
            {
                var monthlyRevenue = sub.Plan?.PriceMonthly ?? 0;
                for (int i = 0; i < 12; i++)
                {
                    if (sub.Plan?.Name?.ToLower().Contains("starter") == true)
                        revenueByPlan.Starter[i] += (int)monthlyRevenue;
                    else if (sub.Plan?.Name?.ToLower().Contains("pro") == true)
                        revenueByPlan.Pro[i] += (int)monthlyRevenue;
                    else if (sub.Plan?.Name?.ToLower().Contains("enterprise") == true)
                        revenueByPlan.Enterprise[i] += (int)monthlyRevenue;
                }
            }

            overview.RevenueByPlan = revenueByPlan;

            // Get user conversion - simplified for now
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            var newUsers = 0; // Would need proper implementation
            var activeUsers = 0; // Would need proper implementation
            var totalUsers = 0; // Would need proper implementation
            var nonActiveUsers = totalUsers - activeUsers;

            overview.UserConversion = new UserConversionDto
            {
                NewUsers = Enumerable.Repeat(newUsers / 30, 12).Select(x => (int)x).ToList(),
                ActiveUsers = Enumerable.Repeat(activeUsers, 12).ToList(),
                NonActiveUsers = Enumerable.Repeat(nonActiveUsers, 12).ToList()
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

            // Try to get analytics from Zernio
            try
            {
                // Get all workspace IDs
                var workspaceIds = allWorkspaces.Select(w => w.Id).ToList();
                var profiles = await _zernioProfileRepository.GetByWorkspaceIdsAsync(workspaceIds);
                if (profiles.Any())
                {
                    var profile = profiles.First();
                    var analytics = await _zernioClient.GetDailyMetricsAsync(
                        profile.ZernioProfileId,
                        DateTime.UtcNow.AddMonths(-12),
                        null,
                        null,
                        null,
                        null,
                        cancellationToken);

                    if (analytics?.PlatformBreakdown != null)
                    {
                        // Process analytics data for posts by platform
                        var postsByPlatform = new Dictionary<string, List<int>>();
                        var engagementByPlatform = new Dictionary<string, EngagementDto>();

                        // Initialize platforms
                        foreach (var platformData in analytics.PlatformBreakdown)
                        {
                            var platform = platformData.Platform.ToLower();
                            if (!postsByPlatform.ContainsKey(platform))
                            {
                                postsByPlatform[platform] = new List<int>();
                                engagementByPlatform[platform] = new EngagementDto();
                            }
                        }

                        // Fill with monthly data (simplified - using same values for all months)
                        foreach (var platformData in analytics.PlatformBreakdown)
                        {
                            var platform = platformData.Platform.ToLower();
                            for (int i = 0; i < 12; i++)
                            {
                                postsByPlatform[platform].Add((int)platformData.PostCount);
                                engagementByPlatform[platform].Likes.Add((int)platformData.Likes);
                                engagementByPlatform[platform].Shares.Add((int)platformData.Shares);
                            }
                        }

                        overview.PostsByPlatform = postsByPlatform;
                        overview.EngagementByPlatform = engagementByPlatform;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get analytics from Zernio for admin overview");
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
