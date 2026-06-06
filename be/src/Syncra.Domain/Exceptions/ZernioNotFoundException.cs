namespace Syncra.Domain.Exceptions;

public sealed class ZernioNotFoundException : Exception
{
    public string? ResourceType { get; }
    public object? Details { get; }

    public ZernioNotFoundException(string message, string? resourceType = null, object? details = null)
        : base(message)
    {
        ResourceType = resourceType;
        Details = details;
    }

    public ZernioNotFoundException(string message, Exception innerException, string? resourceType = null, object? details = null)
        : base(message, innerException)
    {
        ResourceType = resourceType;
        Details = details;
    }
}
