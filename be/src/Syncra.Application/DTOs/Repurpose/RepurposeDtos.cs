namespace Syncra.Application.DTOs.Repurpose;

/// <summary>
/// Metadata for a supporting source (URL or file) attached to a repurpose request.
/// </summary>
public sealed record SupportingSourceInfo(
    string Id,
    string Type,    // "url" | "file"
    string Label,
    string? Url,
    string? FileName);

/// <summary>
/// Request to generate repurposed content from a source text.
/// </summary>
public sealed record RepurposeRequest(
    string SourceText,
    IReadOnlyList<string> Platforms,
    string Tone,
    bool ExtractAtoms,
    string Language = "en",
    string ContentLength = "medium",
    IReadOnlyList<SupportingSourceInfo>? SupportingSources = null,
    IReadOnlyList<Guid>? SelectedPostIds = null,
    bool? GenerateMedia = null,
    string? MediaType = null);

/// <summary>
/// A single piece of repurposed content for a specific platform.
/// </summary>
public sealed record RepurposeAtom(
    string Id,
    string Type,       // POST, THREAD, CAROUSEL, INSIGHT, TIP, QUOTE
    string? Title,
    string Content,
    string Platform,
    IReadOnlyList<string> SuggestedHashtags,
    string? SuggestedCta,
    string? MediaUrl = null,
    string? MediaType = null);

/// <summary>
/// Result of a repurpose generation request.
/// </summary>
public sealed record RepurposeResult(
    IReadOnlyList<RepurposeAtom> Atoms);

public sealed record RepurposeStreamEvent(string Type, object Data);

/// <summary>
/// Lightweight summary of a repurpose session for list display.
/// Does not include atom content — use GetSessionAsync for full detail.
/// </summary>
public sealed record RepurposeSessionSummary(
    string Id,
    string SourceText,
    string TargetPlatforms,
    string Tone,
    string Status,
    string Language,
    string ContentLength,
    bool ExtractAtoms,
    DateTime CreatedAtUtc,
    string? SupportingSourcesJson = null);
