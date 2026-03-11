namespace Syncra.Domain.Entities;

public sealed class UsageCounter : WorkspaceEntityBase
{
    public string MetricCode { get; set; } = string.Empty;
    public DateTime PeriodStartUtc { get; set; }
    public DateTime PeriodEndUtc { get; set; }
    public long Value { get; set; }

    public Workspace Workspace { get; set; } = null!;
}
