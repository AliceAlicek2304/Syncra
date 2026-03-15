namespace Syncra.Domain.Entities;

public abstract class WorkspaceEntityBase : EntityBase
{
    // Properties with private setters
    public Guid WorkspaceId { get; set; }

    // Protected parameterless constructor for EF Core
    protected WorkspaceEntityBase() { }

    // Factory method for derived entities
    protected static T Create<T>(Guid workspaceId) where T : WorkspaceEntityBase, new()
    {
        return new T
        {
            WorkspaceId = workspaceId,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };
    }
}
