using System.Text.RegularExpressions;

namespace Syncra.Domain.ValueObjects;

public sealed class WorkspaceSlug : IEquatable<WorkspaceSlug>
{
    public const int MinLength = 3;
    public const int MaxLength = 50;

    private static readonly Regex SlugRegex = new(@"^[a-z0-9][a-z0-9-]*[a-z0-9]$", RegexOptions.Compiled);

    public string Value { get; }

    private WorkspaceSlug(string value) => Value = value;

    public static WorkspaceSlug Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Workspace slug cannot be empty.", nameof(value));
        }

        var normalized = Normalize(value.Trim());

        if (normalized.Length < MinLength || normalized.Length > MaxLength)
        {
            throw new ArgumentException($"Workspace slug must be between {MinLength} and {MaxLength} characters.", nameof(value));
        }

        if (!SlugRegex.IsMatch(normalized))
        {
            throw new ArgumentException("Workspace slug can only contain lowercase letters, numbers, and hyphens. It must start and end with a letter or number.", nameof(value));
        }

        return new WorkspaceSlug(normalized);
    }

    private static string Normalize(string value)
    {
        var result = value.ToLowerInvariant();

        result = Regex.Replace(result, @"[^a-z0-9-]", "-");

        result = Regex.Replace(result, @"-+", "-");

        result = result.Trim('-');

        return result;
    }

    public static implicit operator string(WorkspaceSlug slug) => slug.Value;

    public bool Equals(WorkspaceSlug? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as WorkspaceSlug);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Value ?? string.Empty;
}