using Syncra.Domain.Enums;

namespace Syncra.Domain.Entities;

public sealed class RepurposeSession : WorkspaceEntityBase
{
    public string SourceText { get; private set; } = string.Empty;
    public string Tone { get; private set; } = string.Empty;
    public string TargetPlatforms { get; private set; } = string.Empty;
    public string ContentLength { get; private set; } = "medium";
    public string Language { get; private set; } = "en";
    public bool ExtractAtoms { get; private set; }
    public RepurposeSessionStatus Status { get; private set; } = RepurposeSessionStatus.Generating;
    public string? ErrorMessage { get; private set; }
    public string? SupportingSourcesJson { get; private set; }

    // Navigation property
    public Workspace Workspace { get; set; } = null!;
    public ICollection<RepurposeAtom> Atoms { get; private set; } = new List<RepurposeAtom>();

    private RepurposeSession() { }

    public static RepurposeSession Create(
        Guid workspaceId, 
        string sourceText, 
        string tone, 
        string targetPlatforms,
        string contentLength = "medium",
        string language = "en",
        bool extractAtoms = false,
        string? supportingSourcesJson = null)
    {
        var now = DateTime.UtcNow;
        return new RepurposeSession
        {
            WorkspaceId = workspaceId,
            SourceText = sourceText,
            Tone = tone,
            TargetPlatforms = targetPlatforms,
            ContentLength = contentLength,
            Language = language,
            ExtractAtoms = extractAtoms,
            SupportingSourcesJson = supportingSourcesJson,
            Status = RepurposeSessionStatus.Generating,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };
    }

    public void AddAtom(RepurposeAtom atom)
    {
        Atoms.Add(atom);
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkAsCompleted()
    {
        Status = RepurposeSessionStatus.Completed;
        UpdatedAtUtc = DateTime.UtcNow;
    }

    public void MarkAsFailed(string error)
    {
        Status = RepurposeSessionStatus.Failed;
        ErrorMessage = error;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
