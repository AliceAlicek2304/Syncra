using System.Text;
using Syncra.Application.DTOs.Repurpose;
using Syncra.Application.Interfaces;

namespace Syncra.Application.Services;

public sealed class PromptEngineeringService : IPromptEngineeringService
{
    private static readonly Dictionary<string, string> ToneGuidance = new()
    {
        ["professional"] = "Formal, authoritative, data-driven. Use industry terminology.",
        ["casual"] = "Conversational, friendly, approachable. Use everyday language.",
        ["bold"] = "Confident, provocative, attention-grabbing. Use strong statements.",
        ["educational"] = "Instructive, explanatory, value-focused. Break down concepts.",
        ["adaptive"] = "Match the source text's original tone and style.",
    };

    private static readonly Dictionary<string, string> ContentLengthConstraints = new()
    {
        ["short"] = "Each post must be SHORT — under ~150 characters. Be extremely concise.",
        ["medium"] = "Aim for 200-400 characters per post. Balanced depth.",
        ["long"] = "Posts can use the platform's full character limit. Be thorough and detailed.",
    };

    private static readonly Dictionary<string, PlatformConstraint> PlatformConstraints = new()
    {
        ["linkedin"] = new("max 3000 chars", "professional tone, industry insights, article-style"),
        ["twitter"] = new("max 280 chars", "concise, punchy, conversational"),
        ["instagram"] = new("max 2200 chars", "visual description, emoji-friendly, line breaks"),
        ["tiktok"] = new("max 150 chars", "snappy, hook in first 3 seconds"),
        ["facebook"] = new("max 63206 chars", "engaging, community-focused, discussion-oriented"),
        ["youtube"] = new("max 5000 chars", "description-style, SEO keywords, timestamps"),
        ["pinterest"] = new("max 500 chars", "keyword-rich, descriptive, save-worthy"),
        ["reddit"] = new("max 40000 chars", "discussion-oriented, authentic, community-focused"),
        ["bluesky"] = new("max 300 chars", "link-friendly, conversational, concise"),
        ["threads"] = new("max 500 chars", "conversational, casual, trend-aware"),
        ["googlebusiness"] = new("max 1500 chars", "local-focused, professional, actionable"),
        ["telegram"] = new("max 4096 chars", "announcement-style, direct, informative"),
        ["snapchat"] = new("max 80 chars", "urgent, casual, ephemeral feel"),
        ["whatsapp"] = new("max 4096 chars", "personal, direct, conversational"),
    };

    public PromptComponents BuildPrompt(RepurposeRequest request)
    {
        var tone = string.IsNullOrWhiteSpace(request.Tone) || request.Tone == "default"
            ? "adaptive"
            : request.Tone.ToLowerInvariant();

        var toneGuide = ToneGuidance.GetValueOrDefault(tone, ToneGuidance["adaptive"]);
        var language = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language;

        var systemPrompt = BuildSystemPrompt(tone, toneGuide, language, request.Platforms, request.ExtractAtoms, request.ContentLength);
        var userPrompt = BuildUserPrompt(request.SourceText, request.Platforms, request.ExtractAtoms);

        return new PromptComponents(systemPrompt, userPrompt);
    }

    private static string BuildSystemPrompt(string tone, string toneGuide, string language,
        IReadOnlyList<string> platforms, bool extractAtoms, string contentLength = "medium")
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a social media content repurposing assistant.");
        sb.AppendLine("Your task: rewrite the provided source text into platform-optimized social media posts.");
        sb.AppendLine();
        sb.AppendLine($"TONE: {tone}");
        sb.AppendLine(toneGuide);
        sb.AppendLine();
        sb.AppendLine($"OUTPUT LANGUAGE: {language}");
        sb.AppendLine("IMPORTANT: You MUST output the post content in " + language + ".");
        sb.AppendLine("Platform hashtags should remain in English unless platform convention requires otherwise.");
        sb.AppendLine();
        sb.AppendLine("OUTPUT FORMAT: Strict JSON object with the following schema:");
        sb.AppendLine("{");
        sb.AppendLine("  \"atoms\": [");
        sb.AppendLine("    {");
        sb.AppendLine("      \"platform\": \"platform_name\",");
        sb.AppendLine("      \"type\": \"POST | THREAD | CAROUSEL | INSIGHT | TIP | QUOTE\",");
        sb.AppendLine("      \"title\": \"string or null\",");
        sb.AppendLine("      \"content\": \"post text content\",");
        sb.AppendLine("      \"suggested_hashtags\": [\"#tag1\", \"#tag2\"],");
        sb.AppendLine("      \"suggested_cta\": \"string or null\"");
        sb.AppendLine("    }");
        sb.AppendLine("  ]");
        sb.AppendLine("}");
        sb.AppendLine();
        sb.AppendLine("CONTENT LENGTH CONSTRAINT:");
        var lengthConstraint = ContentLengthConstraints.GetValueOrDefault(contentLength, ContentLengthConstraints["medium"]);
        sb.AppendLine(lengthConstraint);
        sb.AppendLine();

        sb.AppendLine("PLATFORM-SPECIFIC CONSTRAINTS:");
        sb.AppendLine(BuildPlatformConstraintsBlock(platforms));
        sb.AppendLine();
        sb.AppendLine("FEW-SHOT EXAMPLES (follow this structure):");
        sb.AppendLine(BuildFewShots());
        sb.AppendLine();
        sb.Append("Generate exactly one atom per requested platform. ");
        sb.AppendLine("Each atom must respect its platform's constraints.");

        return sb.ToString();
    }

    private static string BuildPlatformConstraintsBlock(IReadOnlyList<string> platforms)
    {
        var sb = new StringBuilder();
        foreach (var platform in platforms)
        {
            var key = platform.ToLowerInvariant().Replace(" ", "");
            if (PlatformConstraints.TryGetValue(key, out var constraint))
            {
                sb.AppendLine($"- {platform}: {constraint.MaxLength}. {constraint.Guidance}.");
            }
        }
        return sb.ToString();
    }

    private static string BuildFewShots()
    {
        return """
Short-form (Twitter/X, Bluesky, Threads, Snapchat):
{ "platform": "twitter", "type": "POST", "title": null, "content": "Just published a deep dive on the future of AI in content marketing. TL;DR: Personalization engines are getting scarily good.", "suggested_hashtags": ["#AI", "#ContentMarketing"], "suggested_cta": "Read the full thread" }

Long-form (LinkedIn, Facebook, Reddit):
{ "platform": "linkedin", "type": "POST", "title": "Key Takeaways", "content": "After analyzing over 500 social media campaigns this quarter, three patterns stand out:\n\n1. Authenticity beats production value\n2. Community engagement drives 3x more reach than broadcasting\n3. Short-form video continues its dominance", "suggested_hashtags": ["#SocialMediaStrategy", "#MarketingInsights"], "suggested_cta": "Share your experience below" }

Visual (Instagram, Pinterest, TikTok, YouTube):
{ "platform": "instagram", "type": "CAROUSEL", "title": "5 Social Media Trends", "content": "Slide 1: 2024 Social Media Trends You Can't Ignore\nSlide 2: Trend 1: Authentic Content wins\nSlide 3: Trend 2: Community over Broadcast\nSlide 4: Trend 3: Short-form Video\nSlide 5: Save this for your strategy!", "suggested_hashtags": ["#SocialMediaTrends", "#ContentStrategy"], "suggested_cta": "Save for later!" }

Messaging (Telegram, WhatsApp, Google Business):
{ "platform": "telegram", "type": "POST", "title": null, "content": "New Update: We've just rolled out AI-powered content repurposing. Paste any article and get platform-optimized posts in seconds. Check it out!", "suggested_hashtags": ["#Update", "#NewFeature"], "suggested_cta": "Try it now" }
""";
    }

    private static string BuildUserPrompt(string sourceText, IReadOnlyList<string> platforms, bool extractAtoms)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Source text:");
        sb.AppendLine("---");
        sb.AppendLine(sourceText);
        sb.AppendLine("---");
        sb.AppendLine();
        sb.Append("Generate optimized social media posts for the following platforms: ");
        sb.AppendLine(string.Join(", ", platforms));
        if (extractAtoms)
        {
            sb.AppendLine("Also extract key insights and quotable moments as additional TIP and QUOTE atoms per platform.");
        }
        return sb.ToString();
    }

    private sealed record PlatformConstraint(string MaxLength, string Guidance);
}
