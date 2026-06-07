namespace Syncra.Domain.Exceptions;

public sealed class ZernioBadRequestException : Exception
{
    public string? ErrorCode { get; }
    public object? Details { get; }

    public ZernioBadRequestException(string message, string? errorCode = null, object? details = null)
        : base(message)
    {
        ErrorCode = errorCode;
        Details = details;
    }

    public ZernioBadRequestException(string message, Exception innerException, string? errorCode = null, object? details = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        Details = details;
    }
}
