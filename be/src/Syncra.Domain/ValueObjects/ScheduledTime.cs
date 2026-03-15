namespace Syncra.Domain.ValueObjects;

public sealed class ScheduledTime : IEquatable<ScheduledTime>
{
    public DateTime UtcValue { get; }

    private ScheduledTime(DateTime utcValue) => UtcValue = utcValue;

    private static readonly ScheduledTime _none = new(default);

    public static ScheduledTime Create(DateTime? value)
    {
        if (!value.HasValue)
        {
            return _none;
        }

        if (value.Value.Kind == DateTimeKind.Unspecified)
        {
            throw new ArgumentException("Scheduled time must have a specified DateTimeKind (Utc or Local).", nameof(value));
        }

        var utc = value.Value.Kind == DateTimeKind.Local
            ? value.Value.ToUniversalTime()
            : value.Value;

        return new ScheduledTime(utc);
    }

    public static ScheduledTime None => _none;

    public bool IsNone => UtcValue == default;

    public bool IsInPast => !IsNone && UtcValue < DateTime.UtcNow;

    public bool IsInFuture => !IsNone && UtcValue > DateTime.UtcNow;

    public static implicit operator DateTime?(ScheduledTime scheduledTime) =>
        scheduledTime.IsNone ? null : scheduledTime.UtcValue;

    public bool Equals(ScheduledTime? other) =>
        other is not null && UtcValue == other.UtcValue;

    public override bool Equals(object? obj) => Equals(obj as ScheduledTime);

    public override int GetHashCode() => UtcValue.GetHashCode();

    public override string ToString() => IsNone ? "None" : UtcValue.ToString("O");
}