namespace Syncra.Shared.Helpers;

public static class DateTimeHelper
{
    /// <summary>
    /// Returns the first day of the current UTC month at midnight.
    /// Used for usage counter period tracking.
    /// </summary>
    public static DateTime CurrentMonthStartUtc()
    {
        var now = DateTime.UtcNow;
        return new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    /// <summary>
    /// Ensures a DateTime has DateTimeKind.Utc, converting from Local if needed.
    /// Throws for Unspecified kind to prevent silent bugs.
    /// </summary>
    public static DateTime EnsureUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => throw new ArgumentException("DateTime must have a specified Kind (Utc or Local).", nameof(value))
        };
    }
}
