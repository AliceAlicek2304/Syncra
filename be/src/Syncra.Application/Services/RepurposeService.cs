using System.Runtime.CompilerServices;
using Microsoft.Extensions.Logging;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;
using Syncra.Domain.Common;

namespace Syncra.Application.Services;

/// <summary>
/// Content repurposing service that transforms source text into
/// platform-optimized content variants.
///
/// V1 uses template-based generation. Future versions will integrate
/// with an LLM or Zernio SDK content API for AI-powered rewriting.
/// </summary>
public sealed class RepurposeService : IRepurposeService
{
    private readonly ILogger<RepurposeService> _logger;

    // Tone prefixes for content titles
    private static readonly Dictionary<string, string> TonePrefixes = new()
    {
        ["professional"] = "Professional",
        ["casual"] = "Casual",
        ["bold"] = "Bold",
        ["educational"] = "Educational",
    };

    // Pre-defined content templates per platform
    private static readonly Dictionary<string, List<TemplateAtom>> PlatformTemplates = new()
    {
        ["linkedin"] = new()
        {
            new("POST", "Key Takeaway",
                "A professional breakdown of the main ideas from your source content, tailored for LinkedIn engagement.",
                ["#insights", "#professional", "#growth"], "What are your thoughts? Share below."),
            new("CAROUSEL", "5 Points to Remember",
                "Slide 1: Introduction\nSlide 2: Point One\nSlide 3: Point Two\nSlide 4: Point Three\nSlide 5: Conclusion & CTA",
                ["#carousel", "#learning", "#tips"], "Save this for later!"),
        },
        ["twitter"] = new()
        {
            new("THREAD", "Thread",
                "1/ A concise thread based on your source.\n\n2/ Key point one explained briefly.\n\n3/ Key point two with a different angle.\n\n4/ Wrap-up and call to action.",
                ["#thread", "#insights"], "Follow for more content like this."),
            new("POST", "Hot Take",
                "A bold, concise statement derived from your source text. Under 280 characters for maximum impact.",
                ["#hottake", "#opinion"], "Agree or disagree?"),
        },
        ["instagram"] = new()
        {
            new("CAROUSEL", "Visual Story",
                "Carousel post with visually-driven captions. Each slide has a clear hook and takeaway.",
                ["#instagood", "#contentcreator", "#visualstory"], "Double tap if this resonates!"),
            new("POST", "Caption",
                "An engaging Instagram caption with emoji-friendly formatting and line breaks for readability.",
                ["#caption", "#socialmedia", "#engagement"], "Tag someone who needs to see this."),
        },
        ["tiktok"] = new()
        {
            new("POST", "TikTok Script",
                "A short, punchy script optimized for TikTok. Hook in first 3 seconds, value in the middle, CTA at the end.",
                ["#tiktok", "#viral", "#fyp"], "Follow for more content like this!"),
            new("TIP", "TikTok Strategy Tip",
                "Short-form video tip derived from your source content. Keep it under 60 seconds for maximum retention.",
                ["#tiktoktips", "#contentstrategy"], "Try this in your next video!"),
        },
        ["facebook"] = new()
        {
            new("POST", "Facebook Update",
                "An engaging Facebook post that sparks conversation in groups and on your timeline.",
                ["#facebook", "#community", "#discussion"], "Share your experience in the comments."),
            new("INSIGHT", "Community Insight",
                "A deeper dive into the topic, formatted for Facebook's feed algorithm with engaging hooks.",
                ["#insights", "#facebook"], "Tag a friend who needs to see this."),
        },
        ["youtube"] = new()
        {
            new("POST", "Video Description",
                "An SEO-optimized YouTube video description with timestamps, links, and engagement prompts.",
                ["#youtube", "#video", "#tutorial"], "Watch the full video and subscribe!"),
            new("INSIGHT", "Video Script Outline",
                "A structured outline for a YouTube video based on your source content, with hook, main points, and CTA.",
                ["#youtubetips", "#contentcreation"], "Like and subscribe for more!"),
        },
        ["pinterest"] = new()
        {
            new("POST", "Pinterest Pin",
                "An informative pin description with keywords optimized for Pinterest search.",
                ["#pinterest", "#infographic", "#tips"], "Save this pin for later!"),
            new("CAROUSEL", "Step-by-Step Guide",
                "Slide 1: Title\nSlide 2: What you need\nSlide 3: Step 1\nSlide 4: Step 2\nSlide 5: Result & CTA",
                ["#guide", "#howto", "#pinterest"], "Follow our board for more!"),
        },
    };

    public RepurposeService(ILogger<RepurposeService> logger)
    {
        _logger = logger;
    }

    public Task<Result<RepurposeResult>> GenerateAsync(
        RepurposeRequest request,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var atoms = new List<RepurposeAtom>();
        var id = 1;

        var tonePrefix = TonePrefixes.GetValueOrDefault(request.Tone, string.Empty);

        foreach (var platform in request.Platforms)
        {
            var platformLower = platform.ToLowerInvariant();

            // Try to find a template for this platform, or use a generic one
            var templates = PlatformTemplates.GetValueOrDefault(platformLower);
            if (templates is null)
            {
                // Generic template for platforms without specific content rules
                templates = new()
                {
                    new("POST", $"{platform} Post",
                        $"A tailored post based on your source content, optimized for {platform} audience engagement.",
                        [$"#{platformLower}", "#content", "#socialmedia"], "Share your thoughts below!"),
                    new("INSIGHT", "Key Insight",
                        $"An actionable insight extracted from your source content, formatted for maximum impact on {platform}.",
                        ["#insights", "#tips"], "Save this for later!"),
                };
            }

            foreach (var template in templates)
            {
                var title = string.IsNullOrEmpty(tonePrefix)
                    ? template.Title
                    : $"{tonePrefix}: {template.Title}";

                atoms.Add(new RepurposeAtom(
                    Id: $"atom-{id++}",
                    Type: template.Type,
                    Title: title,
                    Content: template.Content,
                    Platform: platformLower,
                    SuggestedHashtags: template.Hashtags,
                    SuggestedCta: template.Cta));
            }

            // Extra atoms when extractAtoms is enabled
            if (request.ExtractAtoms)
            {
                atoms.Add(new RepurposeAtom(
                    Id: $"atom-{id++}",
                    Type: "TIP",
                    Title: "Pro Tip",
                    Content: $"A key actionable tip extracted from your source content for {platform}.",
                    Platform: platformLower,
                    SuggestedHashtags: new[] { "#protip", "#actionable" },
                    SuggestedCta: "Try this today!"));

                atoms.Add(new RepurposeAtom(
                    Id: $"atom-{id++}",
                    Type: "QUOTE",
                    Title: "Notable Quote",
                    Content: "\"A powerful quote distilled from your source content.\"",
                    Platform: platformLower,
                    SuggestedHashtags: new[] { "#quote", "#wisdom" },
                    SuggestedCta: null));
            }
        }

        _logger.LogInformation(
            "Generated {AtomCount} repurpose atoms for {PlatformCount} platforms",
            atoms.Count, request.Platforms.Count);

        return Task.FromResult(Result<RepurposeResult>.Success(new RepurposeResult(atoms)));
    }

    public async IAsyncEnumerable<RepurposeStreamEvent> GenerateStreamAsync(
        Guid workspaceId,
        RepurposeRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var result = await GenerateAsync(request, cancellationToken);
        if (result.IsSuccess)
        {
            yield return new RepurposeStreamEvent("complete", result.Value!);
        }
        else
        {
            yield return new RepurposeStreamEvent("error", new { code = "generation_failed", message = result.Error });
        }
    }

    public Task<Result<RepurposeResult>> GetSessionAsync(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(Result<RepurposeResult>.Failure("Sessions not supported in V1 service"));
    }

    public Task<IReadOnlyList<RepurposeSessionSummary>> GetSessionsAsync(
        Guid workspaceId,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyList<RepurposeSessionSummary>>(Array.Empty<RepurposeSessionSummary>());
    }

    public Task<Result<bool>> DeleteSessionAsync(
        Guid workspaceId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(Result<bool>.Failure("Sessions not supported in V1 service"));
    }

    private sealed record TemplateAtom(
        string Type,
        string Title,
        string Content,
        string[] Hashtags,
        string? Cta);
}
