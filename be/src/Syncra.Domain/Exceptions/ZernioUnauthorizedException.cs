namespace Syncra.Domain.Exceptions;

public sealed class ZernioUnauthorizedException : Exception
{
    public object? Details { get; }

    public ZernioUnauthorizedException(string message, object? details = null)
        : base(message)
    {
        Details = details;
    }

    public ZernioUnauthorizedException(string message, Exception innerException, object? details = null)
        : base(message, innerException)
    {
        Details = details;
    }
}
