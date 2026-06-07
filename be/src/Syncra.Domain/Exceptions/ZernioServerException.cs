namespace Syncra.Domain.Exceptions;

public sealed class ZernioServerException : Exception
{
    public int StatusCode { get; }
    public object? Details { get; }

    public ZernioServerException(string message, int statusCode, object? details = null)
        : base(message)
    {
        StatusCode = statusCode;
        Details = details;
    }

    public ZernioServerException(string message, Exception innerException, int statusCode, object? details = null)
        : base(message, innerException)
    {
        StatusCode = statusCode;
        Details = details;
    }
}
