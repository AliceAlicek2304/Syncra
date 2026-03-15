namespace Syncra.Domain.ValueObjects;

public sealed class PostContent : IEquatable<PostContent>
{
    public const int MaxLength = 10000;

    public string Value { get; }

    private PostContent(string value) => Value = value;

    public static PostContent Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return new PostContent(string.Empty);
        }

        var trimmed = value.Trim();

        if (trimmed.Length > MaxLength)
        {
            throw new ArgumentException($"Post content cannot exceed {MaxLength} characters.", nameof(value));
        }

        return new PostContent(trimmed);
    }

    public static PostContent Empty => new(string.Empty);

    public bool IsEmpty => string.IsNullOrWhiteSpace(Value);

    public int Length => Value.Length;

    public static implicit operator string(PostContent content) => content.Value;

    public bool Equals(PostContent? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.Ordinal);

    public override bool Equals(object? obj) => Equals(obj as PostContent);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.Ordinal);

    public override string ToString() => Value ?? string.Empty;
}