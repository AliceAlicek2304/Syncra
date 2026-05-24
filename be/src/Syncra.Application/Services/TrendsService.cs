using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Trends;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Services;

/// <summary>
/// Trends service providing curated trending topics and hashtags.
///
/// V1 uses curated/static trend data based on common social media trends.
/// Future versions will integrate with:
///   - Zernio SDK (if trend data becomes available)
///   - ExplodingTopics API
///   - Google Trends API
/// </summary>
public sealed class TrendsService : ITrendsService
{
    private readonly ILogger<TrendsService> _logger;

    // Pre-curated trending topics covering common social media niches
    private static readonly IReadOnlyList<TrendingTopic> CuratedTrendingTopics = new List<TrendingTopic>
    {
        new("t1", "AI Workflow Automation",   "+142%", "Tech",     "24.5K", "🔥 Very High"),
        new("t2", "Digital Nomad Minimalism",  "+86%",  "Lifestyle","12.1K", "✨ High"),
        new("t3", "Sustainable Creator Economy","+54%", "Business", "9.8K",  "📈 Rising"),
        new("t4", "Prompt Engineering for Artists", "+120%", "Tech", "18.2K", "🔥 Very High"),
        new("t5", "Slow Living Content",       "+42%",  "Lifestyle","8.4K",  "📈 Rising"),
        new("t6", "Micro-SaaS Success Stories", "+95%", "Business", "15.3K", "🔥 Very High"),
        new("t7", "AI Video Generation",       "+167%", "Tech",     "21.1K", "🔥 Very High"),
        new("t8", "Remote Team Culture",       "+38%",  "Business", "6.7K",  "✨ High"),
    };

    // Pre-curated popular hashtags
    private static readonly IReadOnlyList<PopularHashtag> CuratedHashtags = new List<PopularHashtag>
    {
        new("#aitools",       "+210%", "#8b5cf6"),
        new("#productivity",  "+85%",  "#ec4899"),
        new("#contentcreator","+120%", "#22d3ee"),
        new("#solopreneur",   "+45%",  "#f59e0b"),
        new("#futureofwork",  "+160%", "#10b981"),
        new("#digitalnomad",  "+73%",  "#8b5cf6"),
        new("#aitips",        "+140%", "#ec4899"),
        new("#growthmindset", "+55%",  "#f59e0b"),
    };

    public TrendsService(ILogger<TrendsService> logger)
    {
        _logger = logger;
    }

    public Task<Result<TrendsResult>> GetTrendsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        _logger.LogInformation(
            "Returning curated trends for workspace {WorkspaceId}",
            workspaceId);

        var result = new TrendsResult(
            TrendingTopics: CuratedTrendingTopics,
            PopularHashtags: CuratedHashtags,
            Tip: "Chủ đề 'AI Workflow' đang có xu hướng tăng mạnh trên LinkedIn. " +
                 "Hãy thử tạo một bài chia sẻ quy trình làm việc của bạn để thu hút engagement cao.");

        return Task.FromResult(Result<TrendsResult>.Success(result));
    }
}
