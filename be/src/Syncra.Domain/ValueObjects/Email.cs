using System.Text.RegularExpressions;
using Syncra.Domain.Exceptions;

namespace Syncra.Domain.ValueObjects;

public sealed class Email : IEquatable<Email>
{
    private static readonly Regex EmailRegex = new(
        @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
        RegexOptions.Compiled);

    public string Value { get; }

    private Email(string value) => Value = value;

    public static Email Create(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ValidationException("InvalidEmail", "Email cannot be empty.");
        }

        var trimmed = value.Trim();

        if (!EmailRegex.IsMatch(trimmed))
        {
            throw new ValidationException("InvalidEmail", "Invalid email format.");
        }

        return new Email(trimmed.ToLowerInvariant());
    }

    public static Email CreateOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null!;
        }

        try
        {
            return Create(value);
        }
        catch
        {
            return null!;
        }
    }

    public string LocalPart => Value.Split('@')[0];
    public string Domain => Value.Split('@')[1];

    public static implicit operator string(Email email) => email.Value;

    public bool Equals(Email? other) =>
        other is not null && string.Equals(Value, other.Value, StringComparison.OrdinalIgnoreCase);

    public override bool Equals(object? obj) => Equals(obj as Email);

    public override int GetHashCode() => Value.GetHashCode(StringComparison.OrdinalIgnoreCase);

    public override string ToString() => Value;
}