using Syncra.Domain.Exceptions;

namespace Syncra.Domain.ValueObjects;

public sealed class WorkspaceName : IEquatable<WorkspaceName>
{
    public const int MinLength = 1;
    public const int MaxLength = 100;

    private static readonly char[] InvalidChars = ['/', '\'', '"', '\\'];

    public string Value { get; }

    private WorkspaceName(string value) => Value = value;

    public static WorkspaceName Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException("InvalidWorkspaceName", "Workspace name cannot be empty.");
        }

        var trimmed = value.Trim();

        if (trimmed.Length < MinLength || trimmed.Length > MaxLength)
        {
            throw new ValidationException("InvalidWorkspaceName", $"Workspace name must be between {MinLength} and {MaxLength} characters.");
        }

        if (trimmed.IndexOfAny(InvalidChars) >= 0)
        {
            throw new ValidationException("InvalidWorkspaceName", "Workspace name contains invalid characters.");
        }

        return new WorkspaceName(trimmed);
    }

    public static WorkspaceName Empty => new(string.Empty);

    public bool IsEmpty => string.IsNullOrWhiteSpace(Value);

    public static implicit operator string(WorkspaceName name) => name.Value;

    public bool Equals(WorkspaceName? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as WorkspaceName);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Value ?? string.Empty;
}