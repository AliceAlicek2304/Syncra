namespace Syncra.Domain.ValueObjects;

public sealed class PostTitle : IEquatable<PostTitle>
{
    public const int MaxLength = 500;

    public string Value { get; }

    private PostTitle(string value) => Value = value;

    public static PostTitle Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new PostTitle(string.Empty);
        }

        var trimmed = value.Trim();

        if (trimmed.Length > MaxLength)
        {
            throw new ArgumentException($"Post title cannot exceed {MaxLength} characters.", nameof(value));
        }

        return new PostTitle(trimmed);
    }

    public static PostTitle Empty => new(string.Empty);

    public bool IsEmpty => string.IsNullOrWhiteSpace(Value);

    public static implicit operator string(PostTitle title) => title.Value;

    public bool Equals(PostTitle? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as PostTitle);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Value ?? string.Empty;
}