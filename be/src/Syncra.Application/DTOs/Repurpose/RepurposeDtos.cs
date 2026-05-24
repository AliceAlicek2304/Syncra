namespace Syncra.Application.DTOs.Repurpose;

/// <summary>
/// Request to generate repurposed content from a source text.
/// </summary>
public sealed record RepurposeRequest(
    string SourceText,
    IReadOnlyList<string> Platforms,
    string Tone,
    bool ExtractAtoms);

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
    string? SuggestedCta);

/// <summary>
/// Result of a repurpose generation request.
/// </summary>
public sealed record RepurposeResult(
    IReadOnlyList<RepurposeAtom> Atoms);
