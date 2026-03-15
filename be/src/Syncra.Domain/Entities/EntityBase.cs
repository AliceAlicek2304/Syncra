namespace Syncra.Domain.Entities;

public abstract class EntityBase
{
    // Properties with private setters
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }
    public DateTime? DeletedAtUtc { get; protected set; }
    public long Version { get; set; }
    public string? Metadata { get; protected set; }

    // Protected parameterless constructor for EF Core
    protected EntityBase() { }

    // Domain behaviors

    public bool IsDeleted => DeletedAtUtc.HasValue;

    public virtual void MarkAsDeleted()
    {
        if (!DeletedAtUtc.HasValue)
        {
            DeletedAtUtc = DateTime.UtcNow;
            UpdatedAtUtc = DateTime.UtcNow;
            Version++;
        }
    }

    public virtual void Restore()
    {
        if (DeletedAtUtc.HasValue)
        {
            DeletedAtUtc = null;
            UpdatedAtUtc = DateTime.UtcNow;
            Version++;
        }
    }

    public void SetMetadata(string? metadata)
    {
        Metadata = string.IsNullOrWhiteSpace(metadata) ? null : metadata;
        UpdatedAtUtc = DateTime.UtcNow;
    }
}
