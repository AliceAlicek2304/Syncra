using MediatR;
using Microsoft.Extensions.Logging;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;
using Syncra.Domain.Interfaces;
using Syncra.Domain.Enums;

namespace Syncra.Application.Features.Admin.Queries.PostAnalytics;

public sealed class GetPostAnalyticsQueryHandler
    : IRequestHandler<GetPostAnalyticsQuery, Result<PostAnalyticsDto>>
{
    private readonly IPostRepository _postRepository;
    private readonly IUserRepository _userRepository;
    private readonly IWorkspaceRepository _workspaceRepository;
    private readonly ILogger<GetPostAnalyticsQueryHandler> _logger;

    public GetPostAnalyticsQueryHandler(
        IPostRepository postRepository,
        IUserRepository userRepository,
        IWorkspaceRepository workspaceRepository,
        ILogger<GetPostAnalyticsQueryHandler> logger)
    {
        _postRepository = postRepository;
        _userRepository = userRepository;
        _workspaceRepository = workspaceRepository;
        _logger = logger;
    }

    public async Task<Result<PostAnalyticsDto>> Handle(
        GetPostAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        var dto = new PostAnalyticsDto();

        try
        {
            var allWorkspaces = await _workspaceRepository.GetAllAsync(cancellationToken);
            var allUsers = await _userRepository.GetAllAsync(cancellationToken);
            
            var allPosts = new List<Domain.Entities.Post>();
            foreach (var workspace in allWorkspaces)
            {
                var posts = await _postRepository.GetByWorkspaceIdAsync(workspace.Id);
                allPosts.AddRange(posts);
            }

            var totalPosts = allPosts.Count;
            var publishedPosts = allPosts.Count(p => p.Status == PostStatus.Published);
            var scheduledPosts = allPosts.Count(p => p.Status == PostStatus.Scheduled);
            var draftPosts = allPosts.Count(p => p.Status == PostStatus.Draft);
            var failedPosts = allPosts.Count(p => p.Status == PostStatus.Failed);

            // Posts by status
            var statusCounts = allPosts
                .GroupBy(p => p.Status.ToString())
                .Select(g => new PostByStatusDto
                {
                    Status = g.Key,
                    Count = g.Count()
                })
                .ToList();
            dto.PostsByStatus = statusCounts;

            // Posts by platform — count PlatformTarget entries (not distinct posts)
            var platformCounts = new Dictionary<string, int>();
            foreach (var post in allPosts)
            {
                foreach (var target in post.PlatformTargets)
                {
                    var platform = target.Platform;
                    if (!string.IsNullOrEmpty(platform))
                    {
                        if (!platformCounts.ContainsKey(platform))
                            platformCounts[platform] = 0;
                        platformCounts[platform]++;
                    }
                }
            }

            var platformTotal = platformCounts.Values.Sum();
            if (platformTotal == 0) platformTotal = 1;

            var postsByPlatform = platformCounts
                .Select(kvp => new PostByPlatformDto
                {
                    Platform = char.ToUpper(kvp.Key[0]) + kvp.Key.Substring(1),
                    Count = kvp.Value,
                    Percentage = Math.Round((double)kvp.Value / platformTotal * 100, 1)
                })
                .OrderByDescending(p => p.Count)
                .ToList();
            dto.PostsByPlatform = postsByPlatform;

            // Metrics — total uses platformTotal so it always equals sum(postsByPlatform counts)
            dto.Metrics = new List<PostMetricDto>
            {
                new() { Id = "total", Title = "Tổng bài đăng", Value = platformTotal.ToString("N0"), Growth = "+0", Trend = "up" },
                new() { Id = "published", Title = "Đã đăng", Value = publishedPosts.ToString("N0"), Growth = "+0", Trend = "up" },
                new() { Id = "scheduled", Title = "Đã lên lịch", Value = scheduledPosts.ToString("N0"), Growth = "+0", Trend = "up" },
                new() { Id = "draft", Title = "Bản nháp", Value = draftPosts.ToString("N0"), Growth = "+0", Trend = "flat" }
            };

            // Monthly trends
            var monthlyPosts = new List<int>();
            var monthlyPublished = new List<int>();
            var monthlyPostsByPlatform = new Dictionary<string, List<int>>();
            var publishedPostsByPlatform = new Dictionary<string, List<int>>();

            // Initialize dictionaries for known platforms
            foreach (var p in platformCounts.Keys)
            {
                var platformStr = char.ToUpper(p[0]) + p.Substring(1);
                monthlyPostsByPlatform[platformStr] = new List<int>();
                publishedPostsByPlatform[platformStr] = new List<int>();
            }

            for (int i = 11; i >= 0; i--)
            {
                var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).AddMonths(-i);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                
                var postsInMonth = allPosts.Where(p => p.CreatedAtUtc >= monthStart && p.CreatedAtUtc <= monthEnd).ToList();
                var publishedInMonth = allPosts.Where(p => 
                    p.PublishedAtUtc.HasValue && 
                    p.PublishedAtUtc.Value >= monthStart && 
                    p.PublishedAtUtc.Value <= monthEnd).ToList();

                int totalCreatedInMonth = 0;
                int totalPublishedInMonth = 0;

                var createdByPlatform = new Dictionary<string, int>();
                var publishedByPlatform = new Dictionary<string, int>();
                foreach (var p in platformCounts.Keys)
                {
                    var platformStr = char.ToUpper(p[0]) + p.Substring(1);
                    createdByPlatform[platformStr] = 0;
                    publishedByPlatform[platformStr] = 0;
                }

                foreach (var post in postsInMonth)
                {
                    int targets = post.PlatformTargets.Count;
                    totalCreatedInMonth += targets > 0 ? targets : 1;
                    foreach (var target in post.PlatformTargets)
                    {
                        if (!string.IsNullOrEmpty(target.Platform))
                        {
                            var platformStr = char.ToUpper(target.Platform[0]) + target.Platform.Substring(1);
                            if (createdByPlatform.ContainsKey(platformStr)) createdByPlatform[platformStr]++;
                        }
                    }
                }

                foreach (var post in publishedInMonth)
                {
                    int targets = post.PlatformTargets.Count;
                    totalPublishedInMonth += targets > 0 ? targets : 1;
                    foreach (var target in post.PlatformTargets)
                    {
                        if (!string.IsNullOrEmpty(target.Platform))
                        {
                            var platformStr = char.ToUpper(target.Platform[0]) + target.Platform.Substring(1);
                            if (publishedByPlatform.ContainsKey(platformStr)) publishedByPlatform[platformStr]++;
                        }
                    }
                }

                monthlyPosts.Add(totalCreatedInMonth);
                monthlyPublished.Add(totalPublishedInMonth);
                foreach (var kvp in createdByPlatform) monthlyPostsByPlatform[kvp.Key].Add(kvp.Value);
                foreach (var kvp in publishedByPlatform) publishedPostsByPlatform[kvp.Key].Add(kvp.Value);
            }

            var currentMonthPosts = monthlyPosts.LastOrDefault();
            var previousMonthPosts = monthlyPosts.Count > 1 ? monthlyPosts[monthlyPosts.Count - 2] : 0;
            var postsGrowth = currentMonthPosts - previousMonthPosts;

            dto.Trends = new PostTrendsDto
            {
                MonthlyPosts = monthlyPosts,
                PublishedPosts = monthlyPublished,
                MonthlyPostsByPlatform = monthlyPostsByPlatform.ToDictionary(k => k.Key.ToLower(), v => (IEnumerable<int>)v.Value),
                PublishedPostsByPlatform = publishedPostsByPlatform.ToDictionary(k => k.Key.ToLower(), v => (IEnumerable<int>)v.Value),
                CurrentMonthPosts = currentMonthPosts,
                PostsGrowth = postsGrowth
            };

            // Top posters
            var postsByUser = allPosts
                .GroupBy(p => p.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    PostCount = g.Count()
                })
                .OrderByDescending(x => x.PostCount)
                .Take(5)
                .ToList();

            var topPosters = new List<TopPosterDto>();
            foreach (var item in postsByUser)
            {
                var user = allUsers.FirstOrDefault(u => u.Id == item.UserId);
                if (user != null)
                {
                    topPosters.Add(new TopPosterDto
                    {
                        UserId = user.Id.ToString(),
                        UserName = user.Profile != null ? $"{user.Profile.FirstName} {user.Profile.LastName}" : "Unknown",
                        Email = user.Email.Value,
                        PostCount = item.PostCount
                    });
                }
            }
            dto.TopPosters = topPosters;

            return Result.Success(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting post analytics data");
            return Result.Failure<PostAnalyticsDto>(ex.Message);
        }
    }
}
