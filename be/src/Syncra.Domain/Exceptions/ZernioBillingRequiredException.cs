namespace Syncra.Domain.Exceptions;

public sealed class ZernioBillingRequiredException : Exception
{
    public string Reason { get; }
    public string DashboardUrl { get; }
    public object? Details { get; }

    public ZernioBillingRequiredException(string message, string reason, string dashboardUrl, object? details = null)
        : base(message)
    {
        Reason = reason;
        DashboardUrl = dashboardUrl;
        Details = details;
    }
}
